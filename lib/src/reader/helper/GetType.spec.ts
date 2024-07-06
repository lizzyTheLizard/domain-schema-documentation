import { getType } from './GetType'
import { type Application, type Module, type Schema, type Model } from '../Reader'

describe('GetType', () => {
  const application: Application = { title: 'Application', description: 'Application description', errors: [], todos: [], links: [] }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description', errors: [], todos: [], links: [] }
  const schema1: Schema = {
    $id: '/Module/Schema1.yaml',
    'x-schema-type': 'Aggregate',
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
    'x-schema-type': 'ValueObject',
    title: 'Schema 2',
    type: 'object',
    properties: {},
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': []
  }
  const model: Model = { application, modules: [module], schemas: [schema1, schema2] }

  test('getType', async () => {
    expect(getType(model, schema1, { type: 'string' })).toEqual({ type: 'local', name: 'string' })
    expect(getType(model, schema1, { type: 'string', format: 'date' })).toEqual({ type: 'local', name: 'date' })
    expect(getType(model, schema1, { $ref: '../Module2/Schema2.yaml' })).toEqual({ type: 'reference', name: 'Schema 2', $id: '/Module2/Schema2.yaml' })
    expect(getType(model, schema1, { type: 'string', 'x-references': '../Module2/Schema2.yaml' })).toEqual({ type: 'local', name: 'string', references: [{ type: 'reference', name: 'Schema 2', $id: '/Module2/Schema2.yaml' }] })
    expect(getType(model, schema1, { $ref: '#/definitions/SubSchema' })).toEqual({ type: 'definition', name: 'SubSchema' })
  })
})
