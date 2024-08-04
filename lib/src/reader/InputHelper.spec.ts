import {
  cleanName,
  getSchemaName,
  getModuleForSchema,
  getModuleId,
  getSchema,
  getSchemasForModule,
  getSchemasForModuleAndTyp,
  relativeLink,
  resolveRelativeId,
  getModuleName,
  resolveRelativeIdForModule,
} from './InputHelper'
import { testModel, testModule, testSchema } from '../testData'

describe('InputHelper', () => {
  const module = testModule()
  const schema1 = testSchema()
  const model = { ...testModel(), modules: [module], schemas: [schema1] }

  test('getSchemasForModule', () => {
    expect(getSchemasForModule(model, module)).toEqual([schema1])
  })

  test('getSchemasForModuleAndTyp', () => {
    expect(getSchemasForModuleAndTyp(model, module, 'Aggregate')).toEqual([schema1])
    expect(getSchemasForModuleAndTyp(model, module, 'ValueObject')).toEqual([])
  })

  test('getModuleId', () => {
    expect(getModuleId('/Module/Test/Schema.yaml')).toEqual('/Module/Test')
    expect(getModuleId(schema1)).toEqual(module.$id)
  })

  test('getSchema', () => {
    expect(getSchema(model, schema1.$id)).toEqual(schema1)
    expect(() => getSchema(model, '/M/Wrong')).toThrow()
  })

  test('resolveRelativeId', () => {
    expect(resolveRelativeId(schema1, './Test.yaml')).toEqual('/Module/Test.yaml')
    expect(resolveRelativeId(schema1, '../M2/Test.yaml')).toEqual('/M2/Test.yaml')
  })

  test('resolveRelativeIdForModule', () => {
    expect(resolveRelativeIdForModule(module, './Test.yaml')).toEqual('/Module/Test.yaml')
    expect(resolveRelativeIdForModule(module, '../M2/Test.yaml')).toEqual('/M2/Test.yaml')
  })

  test('relativeLink', () => {
    expect(relativeLink('/', schema1)).toEqual('./Module/Schema.yaml')
    expect(relativeLink('/', schema1.$id)).toEqual('./Module/Schema.yaml')
    expect(relativeLink('/Module', schema1)).toEqual('./Schema.yaml')
    expect(relativeLink('/Module2', schema1)).toEqual('../Module/Schema.yaml')
    expect(relativeLink('/Module2/abc', schema1)).toEqual('../../Module/Schema.yaml')
    expect(relativeLink('/Module/abc', schema1)).toEqual('../Schema.yaml')
  })

  test('getSchemaName', () => {
    expect(getSchemaName(schema1)).toEqual('Schema')
    expect(getSchemaName(schema1.$id)).toEqual('Schema')
    expect(getSchemaName('/A/B/ccc.d')).toEqual('ccc')
  })

  test('getModuleName', () => {
    expect(getModuleName(module)).toEqual('Module')
    expect(getModuleName(module.$id)).toEqual('Module')
    expect(getModuleName('/A/B/Module')).toEqual('Module')
  })

  test('getModuleForSchema', () => {
    expect(getModuleForSchema(model, schema1)).toEqual(module)
    expect(getModuleForSchema(model, schema1.$id)).toEqual(module)
    expect(() => getModuleForSchema(model, '/M/Wrong')).toThrow()
  })

  test('cleanName', () => {
    expect(cleanName('smallNow23')).toBe('SmallNow23')
    expect(cleanName('small Now')).toBe('SmallNow')
    expect(cleanName('small-Now')).toBe('SmallNow')
  })
})
