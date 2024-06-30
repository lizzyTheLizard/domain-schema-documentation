import { type Module, type Schema, type Model } from '../../reader/Reader'
import { type Validator } from '../Plugin'
import { existsSync as exists, promises as fs } from 'fs'
import path from 'path'
import { type JavaPluginOptions } from './JavaPlugin'
import { type VerificationError } from '../../writer/Writer'
import { type JavaType, getJavaPropertyType, getSimpleJavaClassName, getJavaPackageNameForModule } from './JavaHelper'
import { getSchemasForModule } from '../../reader/helper/InputHelper'
import { getPropertiesFromImplementation } from './JavaParser'

// TODO: Document

export function javaValidator (options: JavaPluginOptions): Validator {
  if (options.srcDir === undefined) {
    return async () => []
  }
  return async (model: Model) => await flatAsync(model.modules.map(async module => {
    const dir = getModuleDir(module, options)
    const files = await readDirRecursive(dir)
    const fileErrors = await flatAsync(files.map(async file => await verifyFile(model, module, file)))
    const schemaErrors = await flatAsync(model.schemas.map(async schema => await verifySchema(model, module, schema, options)))
    return [...fileErrors, ...schemaErrors]
  }))
}

async function readDirRecursive (dir: string): Promise<string[]> {
  let result: string[] = []
  if (!exists(dir)) {
    return []
  }
  const files = await fs.readdir(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    const lstat = await fs.lstat(filePath)
    if (lstat.isDirectory()) {
      const subFiles = await readDirRecursive(filePath)
      result = result.concat(subFiles)
    } else {
      result.push(file)
    }
  }
  return result
}

async function verifyFile (model: Model, module: Module, file: string): Promise<VerificationError[]> {
  // FIXME: Disable in config
  if (path.extname(file) !== '.java') {
    // Not a Java file, ignore
    return []
  }
  const className = path.basename(file, path.extname(file))
  const schema = getSchemasForModule(model, module).find(s => className === path.basename(s.$id, path.extname(s.$id)))
  if (!schema) {
    return [{ module, text: `File ${file} does not correspond to a domain model`, type: 'NOT_IN_DOMAIN_MODEL' }]
  }
  return []
}

async function verifySchema (model: Model, module: Module, schema: Schema, options: JavaPluginOptions): Promise<VerificationError[]> {
  // FIXME: Sub- Definitions
  const filename = path.join(getModuleDir(module, options), getSimpleJavaClassName(schema) + '.java')
  if (!exists(filename)) {
    return [{ schema, text: `Schema '${schema.$id}' is missing in the implementation`, type: 'MISSING_IN_IMPLEMENTATION' }]
  }
  const results: VerificationError[] = []
  const domainProperties = 'properties' in schema ? schema.properties : { }
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

async function flatAsync<T> (input: Array<Promise<T[]>>): Promise<T[]> {
  return (await Promise.all(input)).flat()
}

function typesEqual (type1: JavaType, type2: JavaType): boolean {
  switch (type1.type) {
    case 'CLASS': return type2.type === 'CLASS' && type1.fullName === type2.fullName
    case 'COLLECTION': return type2.type === 'COLLECTION' && typesEqual(type1.items, type2.items)
  }
}
