import { getDependencies } from './GetDependencies'
import { testModel, testSchema } from '../testData'
import { type Schema, type Model } from './Reader'

describe('GetDependencies', () => {
  test('no dependencies', () => {
    const model = testModel()
    const schema = testSchema()
    expect(getDependencies(model, schema)).toEqual([])
  })

  test('property ref', () => {
    const schema1: Schema = { ...testSchema(), 'x-schema-type': 'Entity' }
    const schema2: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { $ref: './Schema.yaml' } } }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: false,
    }])
  })

  test('property ref aggregate 2 aggregate', () => {
    const schema1 = testSchema()
    const schema2: Schema = { ...testSchema(), 'x-schema-type': 'Aggregate', '$id': '/Module/Schema2.yaml', 'properties': { reference: { $ref: './Schema.yaml' } } }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'REFERENCES',
      dependencyName: 'reference',
      array: false,
    }])
  })

  test('property ref array', () => {
    const schema1: Schema = { ...testSchema(), 'x-schema-type': 'Entity' }
    const schema2: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { type: 'array', items: { $ref: './Schema.yaml' } } } }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: true,
    }])
  })

  test('property references', () => {
    const schema1 = testSchema()
    const schema2: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { 'type': 'string', 'x-references': './Schema.yaml' } } }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'REFERENCES',
      dependencyName: 'reference',
      array: false,
    }])
  })

  test('property references array', () => {
    const schema1 = testSchema()
    const schema2: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { type: 'array', items: { 'type': 'string', 'x-references': './Schema.yaml' } } } }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'REFERENCES',
      dependencyName: 'reference',
      array: true,
    }])
  })

  test('oneOf', () => {
    const schema1 = testSchema()
    const schema2: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', oneOf: [{ $ref: './Schema.yaml' }], properties: {} }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'IS_IMPLEMENTED_BY',
      array: false,
    }])
  })

  test('dependency ref', () => {
    const schema1: Schema = { ...testSchema(), 'x-schema-type': 'Entity' }
    const schema2: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { $ref: '#/definitions/Reference' } }, definitions: { Reference: { type: 'object', properties: { reference2: { $ref: './Schema.yaml' } }, required: [] } } }
    const model: Model = { ...testModel(), schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema2,
      toDefinitionName: 'Reference',
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: false,
    }, {
      fromSchema: schema2,
      fromDefinitionName: 'Reference',
      toSchema: schema1,
      type: 'CONTAINS',
      dependencyName: 'reference2',
      array: false,
    }])
  })

  test('dependency ref to main', () => {
    const schema: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { $ref: '#/definitions/Reference' } }, definitions: { Reference: { type: 'object', properties: { reference2: { $ref: '#' } }, required: [] } } }
    const model: Model = { ...testModel(), schemas: [schema] }
    expect(getDependencies(model, schema)).toEqual([{
      fromSchema: schema,
      toSchema: schema,
      toDefinitionName: 'Reference',
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: false,
    }, {
      fromSchema: schema,
      fromDefinitionName: 'Reference',
      toSchema: schema,
      type: 'CONTAINS',
      dependencyName: 'reference2',
      array: false,
    }])
  })

  test('enum reference', () => {
    const schema: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { reference: { $ref: '#/definitions/Reference' } }, definitions: { Reference: { type: 'string', enum: ['A'] } } }
    const model: Model = { ...testModel(), schemas: [schema] }
    expect(getDependencies(model, schema)).toEqual([{
      fromSchema: schema,
      toSchema: schema,
      toDefinitionName: 'Reference',
      type: 'ENUM',
      dependencyName: 'reference',
      array: false,
    }])
  })

  test('additionalProperties', () => {
    const schema: Schema = { ...testSchema(), $id: '/Module/Schema2.yaml', additionalProperties: { $ref: '#/definitions/Reference' }, definitions: { Reference: { type: 'string', enum: ['A'] } } }
    const model: Model = { ...testModel(), schemas: [schema] }
    expect(getDependencies(model, schema)).toEqual([{
      fromSchema: schema,
      toSchema: schema,
      toDefinitionName: 'Reference',
      type: 'ENUM',
      array: true,
    }])
  })
})
