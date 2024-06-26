import { type Schema } from '../../reader/Reader'
import { type PropertyType } from '../../reader/helper/GetType'
import { getFullJavaClassName, getJavaPackageName, getJavaPropertyType, getSimpleJavaClassName } from './JavaHelper'
import { type JavaPluginOptions } from './JavaPlugin'

describe('JavaHelper', () => {
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {}
  }

  test('getJavaPropertyType', () => {
    const options = { mainPackageName: undefined, modelPackageName: undefined, basicTypeMap: { string: 'String' } } as any as JavaPluginOptions
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model', basicTypeMap: { string: 'com.example.CustomString' } } as any as JavaPluginOptions
    const refType: PropertyType = { type: 'reference', name: 'schema', $id: '/Module2/Schema2.yaml' }
    expect(getJavaPropertyType(refType, schema, options)).toEqual({ name: 'Schema2', imports: ['module2.Schema2'] })
    expect(getJavaPropertyType(refType, schema, options2)).toEqual({ name: 'Schema2', imports: ['com.example.module2.model.Schema2'] })
    const selfType: PropertyType = { type: 'self', name: 'Schema1' }
    expect(getJavaPropertyType(selfType, schema, options)).toEqual({ name: 'Schema', imports: ['module.Schema'] })
    expect(getJavaPropertyType(selfType, schema, options2)).toEqual({ name: 'Schema', imports: ['com.example.module.model.Schema'] })
    const definitionType: PropertyType = { type: 'definition', name: 'Schema1' }
    expect(getJavaPropertyType(definitionType, schema, options)).toEqual({ name: 'SchemaSchema1', imports: ['module.SchemaSchema1'] })
    expect(getJavaPropertyType(definitionType, schema, options2)).toEqual({ name: 'SchemaSchema1', imports: ['com.example.module.model.SchemaSchema1'] })
    const arrayType: PropertyType = { type: 'array', array: refType }
    expect(getJavaPropertyType(arrayType, schema, options)).toEqual({ name: 'Collection<Schema2>', imports: ['java.util.Collection', 'module2.Schema2'] })
    expect(getJavaPropertyType(arrayType, schema, options2)).toEqual({ name: 'Collection<Schema2>', imports: ['java.util.Collection', 'com.example.module2.model.Schema2'] })
    const localType: PropertyType = { type: 'local', name: 'string' }
    expect(getJavaPropertyType(localType, schema, options)).toEqual({ name: 'String', imports: [] })
    expect(getJavaPropertyType(localType, schema, options2)).toEqual({ name: 'CustomString', imports: ['com.example.CustomString'] })
  })

  test('getJavaPackageName', () => {
    const options = { mainPackageName: undefined, modelPackageName: undefined } as any as JavaPluginOptions
    expect(getJavaPackageName(schema, options)).toEqual('module')
    expect(getJavaPackageName(schema.$id, options)).toEqual('module')
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model' } as any as JavaPluginOptions
    expect(getJavaPackageName(schema, options2)).toEqual('com.example.module.model')
    expect(getJavaPackageName(schema.$id, options2)).toEqual('com.example.module.model')
  })

  test('getFullJavaClassName', () => {
    const options = { mainPackageName: undefined, modelPackageName: undefined } as any as JavaPluginOptions
    expect(getFullJavaClassName(schema, options)).toEqual('module.Schema')
    expect(getFullJavaClassName(schema.$id, options)).toEqual('module.Schema')
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model' } as any as JavaPluginOptions
    expect(getFullJavaClassName(schema, options2)).toEqual('com.example.module.model.Schema')
    expect(getFullJavaClassName(schema.$id, options2)).toEqual('com.example.module.model.Schema')
  })

  test('getSimpleJavaClassName', () => {
    expect(getSimpleJavaClassName(schema)).toEqual('Schema')
    expect(getSimpleJavaClassName(schema, 'Definition')).toEqual('SchemaDefinition')
    expect(getSimpleJavaClassName(schema.$id, 'Definition')).toEqual('SchemaDefinition')
  })
})
