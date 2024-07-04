import { type Module, type Schema, type Model, type Definition, type ObjectDefinition, type EnumDefinition, type Application, type ImplementationErrorType } from '../../reader/Reader'
import { promises as fs } from 'fs'
import path from 'path'
import { type JavaPluginOptions } from './JavaPlugin'
import { type JavaType, getJavaPropertyType, getSimpleJavaClassName, getJavaPackageNameForModule, getFullJavaClassName } from './JavaHelper'
import { getSchemasForModule } from '../../reader/helper/InputHelper'
import { parseClass, parseEnum, parseInterface } from './JavaParser'

/**
 * Validator for Java files
 * @param model The model to validate
 * @param options The java plugin options
 */
export async function javaValidator (model: Model, options: JavaPluginOptions): Promise<void> {
  // No source directory, no validation
  if (options.srcDir === undefined) return
  const validator = new JavaValidator(model, options)
  for (const module of model.modules) {
    await validator.checkModule(module)
  }
}

class JavaValidator {
  private currentModule!: Module
  private currentSchema!: Schema
  constructor (private readonly model: Model, private readonly options: JavaPluginOptions) {
  }

  public async checkModule (module: Module): Promise<void> {
    this.currentModule = module
    let nbrOfModuleFailures = await this.checkForAdditionalFiles()
    for (const schema of getSchemasForModule(this.model, this.currentModule)) {
      const nbrOfFailues = await this.checkSchema(schema)
      if (nbrOfFailues > 0) {
        nbrOfModuleFailures++
        addError(this.currentModule, `Schema '${schema.title}' has ${nbrOfFailues} java validation errors`, 'WRONG')
      }
    }
    if (nbrOfModuleFailures > 0) {
      addError(this.model.application, `Module '${this.currentModule.title}' has ${nbrOfModuleFailures} java validation errors`, 'WRONG')
    }
  }

  private async checkForAdditionalFiles (): Promise<number> {
    // Check if the module directory exists and should be checked. Otherwise there is no error...
    if (this.options.ignoreAdditionalFiles) return 0
    const dir = this.getModuleDir()
    if (!await existAndAccessible(dir)) return 0

    // Get the list of expected files. One for each definition including the schema itself
    const expectedClasses: string [] = []
    for (const schema of getSchemasForModule(this.model, this.currentModule)) {
      expectedClasses.push(getSimpleJavaClassName(schema))
      for (const definitionName of Object.keys(schema.definitions)) {
        expectedClasses.push(getSimpleJavaClassName(schema, definitionName))
      }
    }

    let nbrOfModuleFailures = 0
    for (const file of await fs.readdir(dir)) {
      // Ignore if it is not a java file
      if (path.extname(file) !== '.java') continue
      const className = path.basename(file, path.extname(file))
      if (expectedClasses.includes(className)) continue
      addError(this.currentModule, `File ${file} does not correspond to a domain model`, 'NOT_IN_DOMAIN_MODEL')
      nbrOfModuleFailures++
    }
    return nbrOfModuleFailures
  }

  private getModuleDir (): string {
    const packageName = getJavaPackageNameForModule(this.currentModule, this.options)
    if (this.options.srcDir === undefined) throw new Error('This is not allowed here, scrDir must be set!')
    const baseDir = typeof this.options.srcDir === 'string' ? this.options.srcDir : this.options.srcDir(this.currentModule)
    return baseDir + (baseDir.endsWith('/') ? '' : '/') + packageName.replaceAll('.', '/')
  }

  private async checkSchema (schema: Schema): Promise<number> {
    let nbrOfFailedSchemas = 0
    this.currentSchema = schema
    nbrOfFailedSchemas += await this.checkDefinition(schema, undefined)
    for (const definitionName of Object.keys(schema.definitions)) {
      const definition = schema.definitions[definitionName]
      nbrOfFailedSchemas += await this.checkDefinition(definition, definitionName)
    }
    return nbrOfFailedSchemas
  }

  private async checkDefinition (definition: Definition, definitionName: string | undefined): Promise<number> {
    // File must exists, otherwise we cannot check anything anyway
    const filename = path.join(this.getModuleDir(), getSimpleJavaClassName(this.currentSchema, definitionName) + '.java')
    if (!await existAndAccessible(filename)) {
      this.currentSchema['x-errors'] = [...this.currentSchema['x-errors'] ?? [], {
        text: `'${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' should exist but is missing in the implementation`,
        type: 'MISSING_IN_IMPLEMENTATION'
      }]
      return 1
    }
    const fileContent = await fs.readFile(filename).then(b => b.toString())
    if ('properties' in definition) {
      return await this.checkObjectDefinition(fileContent, definition, definitionName)
    }
    if ('oneOf' in definition) {
      return await this.checkInterfaceDefinition(fileContent, definitionName)
    }
    if (definition.type === 'string') {
      return await this.checkEnumDefinition(fileContent, definition, definitionName)
    }
    throw new Error('Unknown definition type')
  }

  private async checkObjectDefinition (fileContent: string, definition: ObjectDefinition, definitionName: string | undefined): Promise<number> {
    const implementationProperties = parseClass(fileContent)
    let nbrOfFailures = 0
    if (typeof implementationProperties === 'string') {
      addErrorToSchema(this.currentSchema, `Class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' is invalid: ${implementationProperties}`, 'WRONG')
      nbrOfFailures++
      return nbrOfFailures
    }
    for (const propertyName of Object.keys(definition.properties)) {
      if (!(propertyName in implementationProperties)) {
        addErrorToSchema(this.currentSchema, `Property '${propertyName}' is missing in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`, 'MISSING_IN_IMPLEMENTATION')
        nbrOfFailures++
      }
    }
    for (const propertyName of Object.keys(implementationProperties)) {
      if (!(propertyName in definition.properties)) {
        addErrorToSchema(this.currentSchema, `Property '${propertyName}' should not exist in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`, 'NOT_IN_DOMAIN_MODEL')
        nbrOfFailures++
        continue
      }
      const domainType = getJavaPropertyType(this.model, this.currentSchema, definition.properties[propertyName], this.options)
      const implType = implementationProperties[propertyName]
      if (!typesEqual(domainType, implType)) {
        addErrorToSchema(this.currentSchema, `Property '${propertyName}' has type '${printType(implType)}' in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' but should have type '${printType(domainType)}'`, 'WRONG')
        nbrOfFailures++
      }
    }
    return nbrOfFailures
  }

  private async checkInterfaceDefinition (fileContent: string, definitionName: string | undefined): Promise<number> {
    let nbrOfFailures = 0
    const parseResult = parseInterface(fileContent)
    if (typeof parseResult === 'string') {
      addErrorToSchema(this.currentSchema, `Interface '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' is invalid: ${parseResult}`, 'WRONG')
      nbrOfFailures++
      return nbrOfFailures
    }
    return nbrOfFailures
  }

  private async checkEnumDefinition (fileContent: string, definition: EnumDefinition, definitionName: string | undefined): Promise<number> {
    let nbrOfFailures = 0
    const enumValues = parseEnum(fileContent)
    if (typeof enumValues === 'string') {
      addErrorToSchema(this.currentSchema, `Enum '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' is invalid: ${enumValues}`, 'WRONG')
      nbrOfFailures++
      return nbrOfFailures
    }
    const expectedValues = definition.enum
    for (const value of expectedValues) {
      if (!enumValues.includes(value)) {
        addErrorToSchema(this.currentSchema, `Value '${value}' is missing in enum '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`, 'MISSING_IN_IMPLEMENTATION')
        nbrOfFailures++
      }
    }
    for (const value of enumValues) {
      if (!expectedValues.includes(value)) {
        addErrorToSchema(this.currentSchema, `Value '${value}' should not exist in enum '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`, 'NOT_IN_DOMAIN_MODEL')
        nbrOfFailures++
      }
    }
    return nbrOfFailures
  }
}

function addError (obj: Application | Module, text: string, type: ImplementationErrorType): void {
  obj.errors = [...obj.errors ?? [], { text, type }]
}

function addErrorToSchema (obj: Schema, text: string, type: ImplementationErrorType): void {
  obj['x-errors'] = [...obj['x-errors'] ?? [], { text, type }]
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
