import { type Module, type Schema, type Model, type Definition } from '../../reader/Reader'
import { type Validator } from '../Plugin'
import { promises as fs } from 'fs'
import path from 'path'
import { type JavaPluginOptions } from './JavaPlugin'
import { type VerificationError } from '../../writer/Writer'
import { type JavaType, getJavaPropertyType, getSimpleJavaClassName, getJavaPackageNameForModule } from './JavaHelper'
import { getSchemasForModule } from '../../reader/helper/InputHelper'
import { getPropertiesFromImplementation } from './JavaParser'

// TODO: Document

export function javaValidator (options: JavaPluginOptions): Validator {
  // No source directory, no validation
  if (options.srcDir === undefined) return async () => []
  return async (model: Model) => {
    const result: VerificationError[] = []
    for (const module of model.modules) {
      result.push(...await checkForAdditionalFiles(model, module, options))
      result.push(...await checkSchemas(model, module, options))
    }
    return result
  }
}

async function checkForAdditionalFiles (model: Model, module: Module, options: JavaPluginOptions): Promise<VerificationError[]> {
  if (options.ignoreAdditionalFiles) return []
  const dir = getModuleDir(module, options)
  // If there is no dir, there are no additional files
  if (!await isAccessible(dir)) return []
  const results: VerificationError[] = []
  const expectedFiles = getSchemasForModule(model, module).flatMap(s => [getSimpleJavaClassName(s), ...Object.keys(s.definitions).map(d => getSimpleJavaClassName(s, d))])
  const files = await fs.readdir(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    // There should not be any subdirs
    if (await isDirectory(filePath)) {
      results.push({ module, text: `Directory ${file} does not correspond to a domain model`, type: 'NOT_IN_DOMAIN_MODEL' })
    }
    // Ignore if it is not a java file
    if (path.extname(file) !== '.java') continue
    const className = path.basename(file, path.extname(file))
    if (expectedFiles.includes(className)) continue
    results.push({ module, text: `File ${file} does not correspond to a domain model`, type: 'NOT_IN_DOMAIN_MODEL' })
  }
  return results
}

async function checkSchemas (model: Model, module: Module, options: JavaPluginOptions): Promise<VerificationError[]> {
  const results: VerificationError[] = []
  for (const schema of getSchemasForModule(model, module)) {
    const filename = path.join(getModuleDir(module, options), getSimpleJavaClassName(schema) + '.java')
    results.push(...await verifyDefinition(model, schema, filename, schema, options))
    for (const definitionName of Object.keys(schema.definitions)) {
      const filename = path.join(getModuleDir(module, options), getSimpleJavaClassName(schema, definitionName) + '.java')
      const definition = schema.definitions[definitionName]
      results.push(...await verifyDefinition(model, schema, filename, definition, options))
    }
  }
  return results
}

async function verifyDefinition (model: Model, schema: Schema, filename: string, definition: Definition, options: JavaPluginOptions): Promise<VerificationError[]> {
  if (!await isAccessible(filename)) {
    return [{ schema, text: `File '${filename}' should exist but is missing in the implementation`, type: 'MISSING_IN_IMPLEMENTATION' }]
  }
  const results: VerificationError[] = []
  const domainProperties = 'properties' in definition ? definition.properties : { }
  const implementationProperties = await getPropertiesFromImplementation(filename)
  for (const propertyName of Object.keys(domainProperties)) {
    if (!(propertyName in implementationProperties)) {
      results.push({ schema, text: `Property '${propertyName}' is missing in the implementation`, type: 'MISSING_IN_IMPLEMENTATION' })
    }
  }
  for (const propertyName of Object.keys(implementationProperties)) {
    if (!(propertyName in domainProperties)) {
      results.push({ schema, text: `Property '${propertyName}' does not exist in the domain model`, type: 'NOT_IN_DOMAIN_MODEL' })
      continue
    }
    const domainType = getJavaPropertyType(model, schema, domainProperties[propertyName], options)
    const implType = implementationProperties[propertyName]
    if (!typesEqual(domainType, implType)) {
      results.push({ schema, text: `Property '${propertyName}' has type '${printType(implType)}' in the implementation but '${printType(domainType)}' in the domain model`, type: 'WRONG' })
    }
  }
  return results
}

async function isAccessible (file: string): Promise<boolean> {
  const exists = await fs.stat(file).then(_ => true).catch(_ => false)
  if (!exists) return false
  return await fs.access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

async function isDirectory (file: string): Promise<boolean> {
  const lstat = await fs.lstat(file)
  return lstat.isDirectory()
}

function printType (type: JavaType): string {
  switch (type.type) {
    case 'CLASS': return type.fullName
    case 'COLLECTION': return `${printType(type.items)}[]`
  }
}

function getModuleDir (module: Module, options: JavaPluginOptions): string {
  const packageName = getJavaPackageNameForModule(module, options)
  if (options.srcDir === undefined) throw new Error('This is not allowed here, scrDir must be set!')
  return path.join(typeof options.srcDir === 'string' ? options.srcDir : options.srcDir(module), packageName.replace('.', '/'))
}

function typesEqual (type1: JavaType, type2: JavaType): boolean {
  switch (type1.type) {
    case 'CLASS': return type2.type === 'CLASS' && type1.fullName === type2.fullName
    case 'COLLECTION': return type2.type === 'COLLECTION' && typesEqual(type1.items, type2.items)
  }
}
