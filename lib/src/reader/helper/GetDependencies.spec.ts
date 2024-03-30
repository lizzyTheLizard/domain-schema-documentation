import { type Application, type Module, type Schema } from '../Model'
import { getDependencies } from './GetDependencies'

describe('GetDependencies', () => {
  const application: Application = { title: 'Application', description: 'Application description' }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description' }
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {}
  }

  test('no dependencies', async () => {
    const model = { application, modules: [module], schemas: [schema] }
    expect(getDependencies(model, schema)).toEqual([])
  })

  test('property ref', async () => {
    const schema2 = { ...schema, $id: '/Module/Schema2.yaml', properties: { reference: { $ref: './Schema.yaml' } } }
    const model = { application, modules: [module], schemas: [schema, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema,
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: false
    }])
  })

  test('property ref aggregate 2 aggregate', async () => {
    const schema1: Schema = { ...schema, 'x-schema-type': 'Aggregate' }
    const schema2: Schema = { ...schema, 'x-schema-type': 'Aggregate', $id: '/Module/Schema2.yaml', properties: { reference: { $ref: './Schema.yaml' } } }
    const model = { application, modules: [module], schemas: [schema1, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema1,
      type: 'REFERENCES',
      dependencyName: 'reference',
      array: false
    }])
  })

  test('property ref array', async () => {
    const schema2: Schema = { ...schema, $id: '/Module/Schema2.yaml', properties: { reference: { type: 'array', items: { $ref: './Schema.yaml' } } } }
    const model = { application, modules: [module], schemas: [schema, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema,
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: true
    }])
  })

  test('property references', async () => {
    const schema2: Schema = { ...schema, $id: '/Module/Schema2.yaml', properties: { reference: { type: 'string', 'x-references': './Schema.yaml' } } }
    const model = { application, modules: [module], schemas: [schema, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema,
      type: 'REFERENCES',
      dependencyName: 'reference',
      array: false
    }])
  })

  test('property references array', async () => {
    const schema2: Schema = { ...schema, $id: '/Module/Schema2.yaml', properties: { reference: { type: 'array', items: { type: 'string', 'x-references': './Schema.yaml' } } } }
    const model = { application, modules: [module], schemas: [schema, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema,
      type: 'REFERENCES',
      dependencyName: 'reference',
      array: true
    }])
  })

  test('oneOf', async () => {
    const schema2: Schema = {
      $id: '/Module/Schema2.yaml',
      'x-schema-type': 'Aggregate',
      title: 'Schema 2',
      type: 'object',
      oneOf: [{ $ref: './Schema.yaml' }],
      definitions: {}
    }
    const model = { application, modules: [module], schemas: [schema, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema,
      type: 'IS_IMPLEMENTED_BY',
      array: false
    }])
  })

  test('dependency ref', async () => {
    const schema2: Schema = {
      ...schema,
      $id: '/Module/Schema2.yaml',
      properties: { reference: { $ref: '#/definitions/Reference' } },
      definitions: { Reference: { type: 'object', properties: { reference2: { $ref: './Schema.yaml' } }, required: [] } }
    }
    const model = { application, modules: [module], schemas: [schema, schema, schema2] }
    expect(getDependencies(model, schema2)).toEqual([{
      fromSchema: schema2,
      toSchema: schema2,
      toDefinitionName: 'Reference',
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: false
    }, {
      fromSchema: schema2,
      fromDefinitionName: 'Reference',
      toSchema: schema,
      type: 'CONTAINS',
      dependencyName: 'reference2',
      array: false
    }])
  })

  test('dependency ref to main', async () => {
    const schema1: Schema = {
      ...schema,
      properties: { reference: { $ref: '#/definitions/Reference' } },
      definitions: { Reference: { type: 'object', properties: { reference2: { $ref: '#' } }, required: [] } }
    }
    const model = { application, modules: [module], schemas: [schema, schema1] }
    expect(getDependencies(model, schema1)).toEqual([{
      fromSchema: schema1,
      toSchema: schema1,
      toDefinitionName: 'Reference',
      type: 'CONTAINS',
      dependencyName: 'reference',
      array: false
    }, {
      fromSchema: schema1,
      fromDefinitionName: 'Reference',
      toSchema: schema1,
      type: 'CONTAINS',
      dependencyName: 'reference2',
      array: false
    }])
  })

  test('enum reference', async () => {
    const schema1: Schema = { ...schema, properties: { reference: { $ref: '#/definitions/Reference' } }, definitions: { Reference: { type: 'string', enum: ['A'] } } }
    const model = { application, modules: [module], schemas: [schema1] }
    expect(getDependencies(model, schema1)).toEqual([{
      fromSchema: schema1,
      toSchema: schema1,
      toDefinitionName: 'Reference',
      type: 'ENUM',
      dependencyName: 'reference',
      array: false
    }])
  })
})
