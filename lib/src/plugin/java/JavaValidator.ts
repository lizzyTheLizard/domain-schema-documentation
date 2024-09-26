import { type Module, type Schema, type Model } from '../../reader/Reader'
import { promises as fs } from 'fs'
import path from 'path'
import { type JavaPluginOptions } from './JavaPlugin'
import { type JavaType, getJavaPropertyType, getSimpleJavaClassName, getJavaPackageNameForModule, getFullJavaClassName, getJavaAdditionalPropertyType } from './JavaHelper'
import { getSchemaName, getSchemasForModule } from '../../reader/InputHelper'
import { parseClass, parseEnum, parseInterface } from './JavaParser'
import { type Definition, type ObjectDefinition, type EnumDefinition } from '../../schemaNormalizer/NormalizedSchema'

/**
 * Validator for Java files
 * @param model The model to validate
 * @param options The java plugin options
 */
export async function javaValidator(model: Model, options: JavaPluginOptions): Promise<void> {
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
  constructor(private readonly model: Model, private readonly options: JavaPluginOptions) {
  }

  public async checkModule(module: Module): Promise<void> {
    this.currentModule = module
    await this.checkForAdditionalFiles()
    for (const schema of getSchemasForModule(this.model, this.currentModule)) {
      await this.checkSchema(schema)
    }
  }

  private async checkForAdditionalFiles(): Promise<void> {
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
      const className = getSchemaName(file)
      if (expectedClasses.includes(className)) continue
      this.currentModule.errors.push({
        text: `File ${file} does not correspond to a domain model`,
        type: 'NOT_IN_DOMAIN_MODEL',
      })
    }
  }

  private getModuleDir(): string {
    const packageName = getJavaPackageNameForModule(this.currentModule, this.options)
    if (this.options.srcDir === undefined) throw new Error('This is not allowed here, scrDir must be set!')
    const baseDir = typeof this.options.srcDir === 'string' ? this.options.srcDir : this.options.srcDir(this.currentModule)
    return baseDir + (baseDir.endsWith('/') ? '' : '/') + packageName.replaceAll('.', '/')
  }

  private async checkSchema(schema: Schema): Promise<void> {
    this.currentSchema = schema
    await this.checkDefinition(schema, undefined)
    for (const definitionName of Object.keys(schema.definitions)) {
      const definition = schema.definitions[definitionName]
      await this.checkDefinition(definition, definitionName)
    }
  }

  private async checkDefinition(definition: Definition, definitionName: string | undefined): Promise<void> {
    // Search for the file in the module directory and its subdirectories
    const filename = await this.findFileInSubfolders(this.getModuleDir(), getSimpleJavaClassName(this.currentSchema, definitionName) + '.java')
    if (!filename) {
      this.currentSchema['x-errors'].push({
        text: `'${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' should exist but is missing in the implementation`,
        type: 'MISSING_IN_IMPLEMENTATION',
      })
      return
    }
    const fileContent = await fs.readFile(filename).then(b => b.toString())
    if ('enum' in definition) {
      this.checkEnumDefinition(fileContent, definition, definitionName)
    } else if ('oneOf' in definition) {
      this.checkInterfaceDefinition(fileContent, definitionName)
    } else {
      this.checkObjectDefinition(fileContent, definition, definitionName)
    }
  }

  private async findFileInSubfolders(dir: string, targetFile: string): Promise<string | undefined> {
    try {
      const dirStat = await fs.stat(dir);
      if (!dirStat.isDirectory()) {
        return undefined;
      }
    } catch (err) {
      // If the directory doesn't exist or there is an error, return undefined
      return undefined;
    }

    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        const found = await this.findFileInSubfolders(res, targetFile);
        if (found) return found;
      } else if (dirent.isFile() && path.basename(res) === targetFile) {
        return res;
      }
    }
    return undefined;
  }

  private checkObjectDefinition(fileContent: string, definition: ObjectDefinition, definitionName: string | undefined): void {
    // Must be a class and have all the needed properties with the correct type
    // Do not check any further methods etc.
    const implementationProperties = parseClass(fileContent)
    if (typeof implementationProperties === 'string') {
      this.currentSchema['x-errors'].push({
        text: `Class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' is invalid: ${implementationProperties}`,
        type: 'WRONG',
      })
      return
    }

    const additionalProperties = 'additionalProperties' in definition ? definition.additionalProperties : false
    if (additionalProperties !== false) {
      if (!('additionalProperties' in implementationProperties)) {
        this.currentSchema['x-errors'].push({
          text: `Additional Properties are missing in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`,
          type: 'MISSING_IN_IMPLEMENTATION',
        })
      } else {
        const domainType = getJavaAdditionalPropertyType(this.model, this.currentSchema, additionalProperties, this.options)
        const implType = implementationProperties.additionalProperties
        if (!typesEqual(domainType, implType)) {
          this.currentSchema['x-errors'].push({
            text: `Additional Properties have type '${printType(implType)}' in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' but should have type '${printType(domainType)}'`,
            type: 'WRONG',
          })
        }
      }
    }

    for (const propertyName of Object.keys(definition.properties)) {
      if (!(propertyName in implementationProperties)) {
        this.currentSchema['x-errors'].push({
          text: `Property '${propertyName}' is missing in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`,
          type: 'MISSING_IN_IMPLEMENTATION',
        })
      }
    }
    for (const propertyName of Object.keys(implementationProperties)) {
      if (propertyName === 'additionalProperties') {
        if (additionalProperties === false) {
          this.currentSchema['x-errors'].push({
            text: `Additional Properties should not exist in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`,
            type: 'NOT_IN_DOMAIN_MODEL',
          })
        }
        continue
      }
      if (!(propertyName in definition.properties)) {
        this.currentSchema['x-errors'].push({
          text: `Property '${propertyName}' should not exist in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`,
          type: 'NOT_IN_DOMAIN_MODEL',
        })
        continue
      }
      const domainType = getJavaPropertyType(this.model, this.currentSchema, definition.properties[propertyName], this.options)
      const implType = implementationProperties[propertyName]
      if (!typesEqual(domainType, implType)) {
        this.currentSchema['x-errors'].push({
          text: `Property '${propertyName}' has type '${printType(implType)}' in class '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' but should have type '${printType(domainType)}'`,
          type: 'WRONG',
        })
      }
    }
  }

  private checkInterfaceDefinition(fileContent: string, definitionName: string | undefined): void {
    // Must be an interface
    // Do not check if methods for properties exist as they could be left out for a good reason
    const parseResult = parseInterface(fileContent)
    if (typeof parseResult === 'string') {
      this.currentSchema['x-errors'].push({
        text: `Interface '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' is invalid: ${parseResult}`,
        type: 'WRONG',
      })
    }
  }

  private checkEnumDefinition(fileContent: string, definition: EnumDefinition, definitionName: string | undefined): void {
    // Check that this is an enum and has the correct set of values
    // Do not check any further methods etc.
    const enumValues = parseEnum(fileContent)
    if (typeof enumValues === 'string') {
      this.currentSchema['x-errors'].push({
        text: `Enum '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}' is invalid: ${enumValues}`,
        type: 'WRONG',
      })
      return
    }
    const expectedValues = definition.enum
    for (const value of expectedValues) {
      if (!enumValues.includes(value)) {
        this.currentSchema['x-errors'].push({
          text: `Value '${value}' is missing in enum '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`,
          type: 'MISSING_IN_IMPLEMENTATION',
        })
      }
    }
    for (const value of enumValues) {
      if (!expectedValues.includes(value)) {
        this.currentSchema['x-errors'].push({
          text: `Value '${value}' should not exist in enum '${getFullJavaClassName(this.currentSchema, this.options, definitionName)}'`,
          type: 'NOT_IN_DOMAIN_MODEL',
        })
      }
    }
  }
}

async function existAndAccessible(file: string): Promise<boolean> {
  const exists = await fs.stat(file).then(_ => true).catch((_: unknown) => false)
  if (!exists) return false
  return await fs.access(file, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false)
}

function printType(type: JavaType): string {
  switch (type.type) {
    case 'CLASS': return type.fullName
    case 'COLLECTION': return `Collection<${printType(type.items)}>`
    case 'MAP': return `Map<String, ${printType(type.items)}>`
  }
}

function typesEqual(type1: JavaType, type2: JavaType): boolean {
  if (type1.type === 'CLASS') {
    if (type2.type !== 'CLASS') return false
    // We want to allow classes to be in sub-packages.
    // Therefore we check if the package is a prefix of the other package and if the class name is the same
    const type1Name = type1.fullName.split('.')
    const type2Name = type2.fullName.split('.')
    if (type1Name.pop() !== type2Name.pop()) return false
    const type1Package = type1Name.join('.')
    const type2Package = type2Name.join('.')
    return type1Package.startsWith(type2Package) || type2Package.startsWith(type1Package)
  }
  if (type2.type === 'CLASS') return false
  if (type1.type !== type2.type) return false
  return typesEqual(type1.items, type2.items)
}
