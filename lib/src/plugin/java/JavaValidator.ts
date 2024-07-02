import { type Module, type Schema, type Model, type Definition, type ObjectDefinition, type EnumDefinition } from '../../reader/Reader'
import { type Validator } from '../Plugin'
import { promises as fs } from 'fs'
import path from 'path'
import { type JavaPluginOptions } from './JavaPlugin'
import { type VerificationError } from '../../writer/Writer'
import { type JavaType, getJavaPropertyType, getSimpleJavaClassName, getJavaPackageNameForModule } from './JavaHelper'
import { getSchemasForModule } from '../../reader/helper/InputHelper'
import { parseClass, parseEnum, parseInterface } from './JavaParser'

/**
 * Validator for Java files
 * @param options Options, @see JavaPluginOptions
 */
export function javaValidator (options: JavaPluginOptions): Validator {
  // No source directory, no validation
  if (options.srcDir === undefined) return async () => []

  return async (model: Model) => {
    const result: VerificationError[] = []
    const validator = new JavaValidator(model, options)
    for (const module of model.modules) {
      const moduleErrors = await validator.checkModule(module)
      result.push(...moduleErrors)
    }
    return result
  }
}

class JavaValidator {
  private currentModule!: Module
  private currentSchema!: Schema
  private results!: VerificationError[]
  constructor (private readonly model: Model, private readonly options: JavaPluginOptions) {
  }

  public async checkModule (module: Module): Promise<VerificationError[]> {
    this.currentModule = module
    this.results = []
    await this.checkForAdditionalFiles()
    for (const schema of getSchemasForModule(this.model, this.currentModule)) {
      await this.checkSchema(schema)
    }
    const moduleErrors = this.results.filter(e => 'module' in e && e.module === this.currentModule)
    if (moduleErrors.length > 0) {
      this.results.push({
        application: this.model.application,
        text: `Module '${this.currentModule.title}' has ${moduleErrors.length} validation errors`,
        type: 'WRONG'
      })
    }
    return this.results
  }

  private async checkForAdditionalFiles (): Promise<void> {
    // Check if the module directory exists and should be checked. Otherwise there is no error...
    if (this.options.ignoreAdditionalFiles) return
    const dir = this.getModuleDir()
    if (!await existAndAccessible(dir)) return

    // Get the list of expected files. One for each definition including the schema itself
    const expectedClasses: string [] = []
    for (const schema of getSchemasForModule(this.model, this.currentModule)) {
      expectedClasses.push(getSimpleJavaClassName(schema))
      for (const definitionName of Object.keys(schema.definitions)) {
        expectedClasses.push(getSimpleJavaClassName(schema, definitionName))
      }
    }

    for (const file of await fs.readdir(dir)) {
      // Ignore if it is not a java file
      if (path.extname(file) !== '.java') continue
      const className = path.basename(file, path.extname(file))
      if (expectedClasses.includes(className)) continue
      this.results.push({
        module: this.currentModule,
        text: `File ${file} does not correspond to a domain model`,
        type: 'NOT_IN_DOMAIN_MODEL'
      })
    }
  }

  private getModuleDir (): string {
    const packageName = getJavaPackageNameForModule(this.currentModule, this.options)
    if (this.options.srcDir === undefined) throw new Error('This is not allowed here, scrDir must be set!')
    const baseDir = typeof this.options.srcDir === 'string' ? this.options.srcDir : this.options.srcDir(this.currentModule)
    return baseDir + (baseDir.endsWith('/') ? '' : '/') + packageName.replaceAll('.', '/')
  }

  private async checkSchema (schema: Schema): Promise<void> {
    this.currentSchema = schema
    await this.checkDefinition(schema, undefined)
    for (const definitionName of Object.keys(schema.definitions)) {
      const definition = schema.definitions[definitionName]
      await this.checkDefinition(definition, definitionName)
    }
    const schemaErrors = this.results.filter(e => 'schema' in e && e.schema === schema)
    if (schemaErrors.length > 0) {
      this.results.push({
        module: this.currentModule,
        text: `Schema '${schema.title}' has ${schemaErrors.length} validation errors`,
        type: 'WRONG'
      })
    }
  }

  private async checkDefinition (definition: Definition, definitionName: string | undefined): Promise<void> {
    // File must exists, otherwise we cannot check anything anyway
    const filename = path.join(this.getModuleDir(), getSimpleJavaClassName(this.currentSchema, definitionName) + '.java')
    if (!await existAndAccessible(filename)) {
      this.results.push({
        schema: this.currentSchema,
        text: `File '${filename}' should exist but is missing in the implementation`,
        type: 'MISSING_IN_IMPLEMENTATION'
      })
      return
    }
    const fileContent = await fs.readFile(filename).then(b => b.toString())
    if ('properties' in definition) {
      this.checkObjectDefinition(filename, fileContent, definition)
      return
    }
    if ('oneOf' in definition) {
      await this.checkInterfaceDefinition(filename, fileContent)
      return
    }
    if (definition.type === 'string') {
      await this.checkEnumDefinition(filename, fileContent, definition)
      return
    }
    throw new Error('Unknown definition type')
  }

  private checkObjectDefinition (filename: string, fileContent: string, definition: ObjectDefinition): void {
    const implementationProperties = parseClass(fileContent)
    if (typeof implementationProperties === 'string') {
      this.results.push({
        schema: this.currentSchema,
        text: `File '${filename}' is invalid: ${implementationProperties}`,
        type: 'WRONG'
      })
      return
    }
    for (const propertyName of Object.keys(definition.properties)) {
      if (!(propertyName in implementationProperties)) {
        this.results.push({
          schema: this.currentSchema,
          text: `Property '${propertyName}' is missing in file '${filename}'`,
          type: 'MISSING_IN_IMPLEMENTATION'
        })
      }
    }
    for (const propertyName of Object.keys(implementationProperties)) {
      if (!(propertyName in definition.properties)) {
        this.results.push({
          schema: this.currentSchema,
          text: `Property '${propertyName}' should not exist in file '${filename}'`,
          type: 'NOT_IN_DOMAIN_MODEL'
        })
        continue
      }
      const domainType = getJavaPropertyType(this.model, this.currentSchema, definition.properties[propertyName], this.options)
      const implType = implementationProperties[propertyName]
      if (!typesEqual(domainType, implType)) {
        this.results.push({
          schema: this.currentSchema,
          text: `Property '${propertyName}' has type '${printType(implType)}' in file '${filename}' but should have type '${printType(domainType)}'`,
          type: 'WRONG'
        })
      }
    }
  }

  private async checkInterfaceDefinition (filename: string, fileContent: string): Promise<void> {
    const parseResult = parseInterface(fileContent)
    if (typeof parseResult === 'string') {
      this.results.push({
        schema: this.currentSchema,
        text: `File '${filename}' is invalid: ${parseResult}`,
        type: 'WRONG'
      })
    }
  }

  private async checkEnumDefinition (filename: string, fileContent: string, definition: EnumDefinition): Promise<void> {
    const enumValues = parseEnum(fileContent)
    if (typeof enumValues === 'string') {
      this.results.push({
        schema: this.currentSchema,
        text: `File '${filename}' is invalid: ${enumValues}`,
        type: 'WRONG'
      })
    }
    const expectedValues = definition.enum
    for (const value of expectedValues) {
      if (!enumValues.includes(value)) {
        this.results.push({
          schema: this.currentSchema,
          text: `Value '${value}' is missing in file '${filename}'`,
          type: 'MISSING_IN_IMPLEMENTATION'
        })
      }
    }
    for (const value of enumValues) {
      if (!expectedValues.includes(value)) {
        this.results.push({
          schema: this.currentSchema,
          text: `Value '${value}' should not exist in file '${filename}'`,
          type: 'NOT_IN_DOMAIN_MODEL'
        })
      }
    }
  }
}

async function existAndAccessible (file: string): Promise<boolean> {
  const exists = await fs.stat(file).then(_ => true).catch(_ => false)
  if (!exists) return false
  return await fs.access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

function printType (type: JavaType): string {
  switch (type.type) {
    case 'CLASS': return type.fullName
    case 'COLLECTION': return `${printType(type.items)}[]`
  }
}

function typesEqual (type1: JavaType, type2: JavaType): boolean {
  switch (type1.type) {
    case 'CLASS': return type2.type === 'CLASS' && type1.fullName === type2.fullName
    case 'COLLECTION': return type2.type === 'COLLECTION' && typesEqual(type1.items, type2.items)
  }
}
