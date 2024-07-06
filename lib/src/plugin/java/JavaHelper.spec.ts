import { type RefProperty, type Schema, type Module, type Application, type ArrayProperty, type BasicProperty } from '../../reader/Reader'
import { getFullJavaClassName, getJavaPackageName, getJavaPropertyType, getSimpleJavaClassName } from './JavaHelper'
import { type JavaPluginOptions } from './JavaPlugin'

describe('JavaHelper', () => {
  const application: Application = { title: 'Application', description: 'Application description', errors: [], todos: [], links: [] }
  const module: Module = {
    $id: '/Module',
    title: 'Module',
    description: 'Module description',
    errors: [],
    todos: [],
    links: []
  }
  const module2: Module = {
    $id: '/Module2',
    title: 'Module 2',
    description: 'Module 2 description',
    errors: [],
    todos: [],
    links: []
  }
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': []

  }
  const schema2: Schema = {
    $id: '/Module2/Schema2.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 2',
    type: 'object',
    properties: {},
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': []
  }

  test('getJavaPropertyType', () => {
    const model = { application, modules: [module, module2], schemas: [schema, schema2] }
    const options = { mainPackageName: undefined, modelPackageName: undefined, basicTypeMap: { string: 'String' } } as any as JavaPluginOptions
    const options2 = { mainPackageName: 'com.example', modelPackageName: 'model', basicTypeMap: { string: 'com.example.CustomString' } } as any as JavaPluginOptions
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
    const basicProperty: BasicProperty = { type: 'string' }
    expect(getJavaPropertyType(model, schema, basicProperty, options)).toEqual({ type: 'CLASS', fullName: 'String' })
    expect(getJavaPropertyType(model, schema, basicProperty, options2)).toEqual({ type: 'CLASS', fullName: 'com.example.CustomString' })
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
