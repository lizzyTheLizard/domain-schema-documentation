import {
  cleanName,
  getModuleForSchema,
  getModuleId,
  getSchema,
  getSchemasForModule,
  getSchemasForModuleAndTyp,
  resolveRelativeId
} from './InputHelper'
import { testModel, testModule, testSchema } from '../../testData'

describe('InputHelper', () => {
  const module = testModule()
  const schema1 = testSchema()
  const model = { ...testModel(), modules: [module], schemas: [schema1] }

  test('getSchemasForModule', async () => {
    expect(getSchemasForModule(model, module)).toEqual([schema1])
  })

  test('getSchemasForModuleAndTyp', async () => {
    expect(getSchemasForModuleAndTyp(model, module, 'Aggregate')).toEqual([schema1])
    expect(getSchemasForModuleAndTyp(model, module, 'ValueObject')).toEqual([])
  })

  test('getModuleId', async () => {
    expect(getModuleId('/Module/Test/Schema.yaml')).toEqual('/Module/Test')
    expect(getModuleId(schema1)).toEqual(module.$id)
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
