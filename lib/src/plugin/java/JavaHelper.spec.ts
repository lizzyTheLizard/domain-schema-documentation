import { type Schema, type Module, type Model } from '../../reader/Reader'
import { findSchemaFileInDir, getFullJavaClassName, getJavaPackageName, getJavaPropertyType, getModuleDir, getSimpleJavaClassName } from './JavaHelper'
import { type JavaPluginOptions } from './JavaPlugin'
import { testModule, testSchema, testModel } from '../../testData'
import { type ArrayProperty, type RefProperty, type StringProperty } from '../../schemaNormalizer/NormalizedSchema'
import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import path from 'path'

describe('JavaHelper', () => {
  test('getJavaPropertyType', () => {
    const schema = testSchema()
    const module2: Module = { ...testModule(), $id: '/Module2' }
    const schema2: Schema = { ...testSchema(), $id: '/Module2/Schema2.yaml' }
    const model: Model = { ...testModel(), modules: [testModule(), module2], schemas: [schema, schema2] }
    const options = { mainPackageName: undefined, modelPackageName: undefined, basicTypeMap: { string: 'String' } } as unknown as JavaPluginOptions
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model', basicTypeMap: { string: 'com.example.CustomString' } } as unknown as JavaPluginOptions
    const refProperty: RefProperty = { $ref: '../Module2/Schema2.yaml' }
    expect(getJavaPropertyType(model, schema, refProperty, options)).toEqual({ type: 'CLASS', fullName: 'module2.Schema2' })
    expect(getJavaPropertyType(model, schema, refProperty, options2)).toEqual({ type: 'CLASS', fullName: 'com.example.module2.model.Schema2' })
    const selfProperty: RefProperty = { $ref: '#' }
    expect(getJavaPropertyType(model, schema, selfProperty, options)).toEqual({ type: 'CLASS', fullName: 'module.Schema' })
    expect(getJavaPropertyType(model, schema, selfProperty, options2)).toEqual({ type: 'CLASS', fullName: 'com.example.module.model.Schema' })
    const definitionProperty: RefProperty = { $ref: '#/definitions/Schema1' }
    expect(getJavaPropertyType(model, schema, definitionProperty, options)).toEqual({ type: 'CLASS', fullName: 'module.SchemaSchema1' })
    expect(getJavaPropertyType(model, schema, definitionProperty, options2)).toEqual({ type: 'CLASS', fullName: 'com.example.module.model.SchemaSchema1' })
    const arrayProperty: ArrayProperty = { type: 'array', items: refProperty }
    expect(getJavaPropertyType(model, schema, arrayProperty, options)).toEqual({ type: 'COLLECTION', items: { type: 'CLASS', fullName: 'module2.Schema2' } })
    expect(getJavaPropertyType(model, schema, arrayProperty, options2)).toEqual({ type: 'COLLECTION', items: { type: 'CLASS', fullName: 'com.example.module2.model.Schema2' } })
    const basicProperty: StringProperty = { type: 'string' }
    expect(getJavaPropertyType(model, schema, basicProperty, options)).toEqual({ type: 'CLASS', fullName: 'String' })
    expect(getJavaPropertyType(model, schema, basicProperty, options2)).toEqual({ type: 'CLASS', fullName: 'com.example.CustomString' })
  })

  test('getJavaPackageName', () => {
    const schema = testSchema()
    const options = { mainPackageName: undefined, modelPackageName: undefined } as unknown as JavaPluginOptions
    expect(getJavaPackageName(schema, options)).toEqual('module')
    expect(getJavaPackageName(schema.$id, options)).toEqual('module')
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model' } as unknown as JavaPluginOptions
    expect(getJavaPackageName(schema, options2)).toEqual('com.example.module.model')
    expect(getJavaPackageName(schema.$id, options2)).toEqual('com.example.module.model')
  })

  test('getFullJavaClassName', () => {
    const schema = testSchema()
    const options = { mainPackageName: undefined, modelPackageName: undefined } as unknown as JavaPluginOptions
    expect(getFullJavaClassName(schema, options)).toEqual('module.Schema')
    expect(getFullJavaClassName(schema.$id, options)).toEqual('module.Schema')
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model' } as unknown as JavaPluginOptions
    expect(getFullJavaClassName(schema, options2)).toEqual('com.example.module.model.Schema')
    expect(getFullJavaClassName(schema.$id, options2)).toEqual('com.example.module.model.Schema')
  })

  test('getSimpleJavaClassName', () => {
    const schema = testSchema()
    expect(getSimpleJavaClassName(schema)).toEqual('Schema')
    expect(getSimpleJavaClassName(schema, 'Definition')).toEqual('SchemaDefinition')
    expect(getSimpleJavaClassName(schema.$id, 'Definition')).toEqual('SchemaDefinition')
  })

  test('getModuleDir', () => {
    const module = testModule()
    expect(getModuleDir(module, '../java', { } as unknown as JavaPluginOptions)).toEqual('../java/module')
    expect(getModuleDir(module, m => '../java' + m.$id + '/src/main/java', { } as unknown as JavaPluginOptions)).toEqual('../java/Module/src/main/java/module')
    expect(getModuleDir(module, '../java', { mainPackageName: 'com.example' } as unknown as JavaPluginOptions)).toEqual('../java/com/example/module')
    expect(getModuleDir(module, m => '../java' + m.$id + '/src/main/java', { mainPackageName: 'com.example', modelPackageName: 'domain' } as unknown as JavaPluginOptions)).toEqual('../java/Module/src/main/java/com/example/module/domain')
  })

  test('findSchemaFileInDir', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema = testSchema()

    expect(await findSchemaFileInDir(tmpDir.name, schema, undefined)).toEqual(undefined)
    await fs.writeFile(path.join(tmpDir.name, 'Schema.java'), 'package module; public class Schema {}')
    expect(await findSchemaFileInDir(tmpDir.name, schema, undefined)).toEqual(path.join(tmpDir.name, '/Schema.java'))

    expect(await findSchemaFileInDir(tmpDir.name, schema, 'Definition')).toEqual(undefined)
    await fs.mkdir(path.join(tmpDir.name, 'subdir'))
    await fs.writeFile(path.join(tmpDir.name, 'subdir', 'SchemaDefinition.java'), 'package module; public class SchemaDefinition {}')
    expect(await findSchemaFileInDir(tmpDir.name, schema, 'Definition')).toEqual(path.join(tmpDir.name, 'subdir', '/SchemaDefinition.java'))
  })
})
