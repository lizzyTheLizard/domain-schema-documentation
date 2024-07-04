import {
  cleanName,
  getModuleForSchema,
  getModuleId,
  getSchema,
  getSchemasForModule,
  getSchemasForModuleAndTyp,
  resolveRelativeId
} from './InputHelper'
import { type Application, type Module, type Schema, type Model } from '../Reader'

describe('InputHelper', () => {
  const application: Application = { title: 'Application', description: 'Application description' }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description' }
  const schema1: Schema = {
    $id: '/Module/Schema1.yaml',
    'x-schema-type': 'Aggregate',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {}
  }
  const schema2: Schema = {
    $id: '/Module2/Schema2.yaml',
    'x-schema-type': 'ValueObject',
    title: 'Schema 2',
    type: 'object',
    properties: {},
    required: [],
    definitions: {}
  }
  const model: Model = { application, modules: [module], schemas: [schema1, schema2] }

  test('getSchemasForModule', async () => {
    expect(getSchemasForModule(model, module)).toEqual([schema1])
  })

  test('getSchemasForModuleAndTyp', async () => {
    expect(getSchemasForModuleAndTyp(model, module, 'Aggregate')).toEqual([schema1])
    expect(getSchemasForModuleAndTyp(model, module, 'ValueObject')).toEqual([])
  })

  test('getModuleId', async () => {
    expect(getModuleId('/Module/Test/Schema.yaml')).toEqual('/Module/Test')
    expect(getModuleId(schema1)).toEqual('/Module')
  })

  test('getSchema', async () => {
    expect(getSchema(model, schema1.$id)).toEqual(schema1)
    expect(() => getSchema(model, '/M/Wrong')).toThrow()
  })

  test('resolveRelativeId', async () => {
    expect(resolveRelativeId(schema1, './Test.yaml')).toEqual('/Module/Test.yaml')
    expect(resolveRelativeId(schema1, '../M2/Test.yaml')).toEqual('/M2/Test.yaml')
    expect(resolveRelativeId(schema1.$id, '../M2/Test.yaml')).toEqual('/M2/Test.yaml')
  })

  test('getModuleForSchema', async () => {
    expect(getModuleForSchema(model, schema1)).toEqual(module)
    expect(getModuleForSchema(model, schema1.$id)).toEqual(module)
    expect(() => getModuleForSchema(model, '/M/Wrong')).toThrow()
  })

  test('cleanName', async () => {
    expect(cleanName('smallNow23')).toBe('SmallNow23')
    expect(cleanName('small Now')).toBe('SmallNow')
    expect(cleanName('small-Now')).toBe('SmallNow')
  })
})
