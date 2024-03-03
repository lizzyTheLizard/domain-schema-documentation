import {
  cleanName,
  getPropertyType,
  getSchemasForModule,
  getSchemasForModuleAndTyp
} from './InputHelper.ts'
import { type Application, type Input, type Module } from './Input.ts'
import { type Schema } from './Schema.ts'

describe('InputHelper', () => {
  const application: Application = { title: 'Application', description: 'Application description' }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description' }
  const schema1: Schema = { $id: '/Module/Schema1.yaml', 'x-schema-type': 'Aggregate', title: 'Schema 1', type: 'object' }
  const schema2: Schema = { $id: '/Module2/Schema2.yaml', 'x-schema-type': 'ValueObject', title: 'Schema 2', type: 'object' }
  const input: Input = { application, modules: [module], schemas: [schema1, schema2] }

  test('cleanName', async () => {
    expect(cleanName('smallNow23')).toBe('SmallNow23')
    expect(cleanName('small Now')).toBe('SmallNow')
    expect(cleanName('small-Now')).toBe('SmallNow')
  })

  test('getSchemasForModule', async () => {
    expect(getSchemasForModule(input, module)).toEqual([schema1])
  })

  test('getSchemasForModuleAndTyp', async () => {
    expect(getSchemasForModuleAndTyp(input, module, 'Aggregate')).toEqual([schema1])
    expect(getSchemasForModuleAndTyp(input, module, 'ValueObject')).toEqual([])
  })

  test('getPropertyType', async () => {
    expect(getPropertyType(input, schema1, { type: 'string' })).toEqual({ type: 'local', name: 'string' })
    expect(getPropertyType(input, schema1, { type: 'string', format: 'date' })).toEqual({ type: 'local', name: 'date' })
    expect(getPropertyType(input, schema1, { type: 'object', $ref: '../Module2/Schema2.yaml' })).toEqual({ type: 'reference', name: 'Schema 2', $id: '/Module2/Schema2.yaml' })
    expect(getPropertyType(input, schema1, { type: 'string', 'x-references': '../Module2/Schema2.yaml' })).toEqual({ type: 'local', name: 'string', references: [{ type: 'reference', name: 'Schema 2', $id: '/Module2/Schema2.yaml' }] })
    expect(getPropertyType(input, schema1, { type: 'object', $ref: '#/definitions/SubSchema' })).toEqual({ type: 'definition', name: 'SubSchema' })
  })
})
