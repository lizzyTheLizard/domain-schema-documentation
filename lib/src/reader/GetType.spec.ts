import { getType } from './GetType'
import { type Schema, type Model } from './Reader'
import { testModel, testSchema } from '../testData'

describe('GetType', () => {
  const schema1 = testSchema()
  const schema2: Schema = { ...testSchema(), '$id': '/Module2/Schema2.yaml', 'x-schema-type': 'ValueObject' }
  const model: Model = { ...testModel(), schemas: [schema1, schema2] }

  test('getType', () => {
    expect(getType(model, schema1, { type: 'string' })).toEqual({ type: 'local', name: 'string' })
    expect(getType(model, schema1, { type: 'object', additionalProperties: true })).toEqual({ type: 'map', items: { type: 'local', name: 'Object' } })
    expect(getType(model, schema1, { type: 'object', additionalProperties: { type: 'string' } })).toEqual({ type: 'map', items: { type: 'local', name: 'string' } })
    expect(getType(model, schema1, { type: 'string', format: 'date' })).toEqual({ type: 'local', name: 'date' })
    expect(getType(model, schema1, { $ref: '../Module2/Schema2.yaml' })).toEqual({ type: 'reference', name: 'Schema', $id: '/Module2/Schema2.yaml' })
    expect(getType(model, schema1, { 'type': 'string', 'x-references': '../Module2/Schema2.yaml' })).toEqual({ type: 'local', name: 'string', references: [{ type: 'reference', name: 'Schema', $id: '/Module2/Schema2.yaml' }] })
    expect(getType(model, schema1, { $ref: '#/definitions/SubSchema' })).toEqual({ type: 'definition', name: 'SubSchema' })
  })
})
