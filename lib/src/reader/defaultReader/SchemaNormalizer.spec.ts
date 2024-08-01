import { type ImplementationError } from '../Reader'
import { type NonNormalizedSchema } from './InputValidator'
import { normalizeSchema } from './SchemaNormalizer'

const common: NonNormalizedSchema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object' }

describe('SchemaNormalizer', () => {
  test('keepLinks', () => {
    const link = { link: 'test', text: 'text' }
    const schema = { ...common, 'x-links': [link], oneOf: [{ $ref: './Schema2.yaml' }] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {},
      oneOf: [{ $ref: './Schema2.yaml' }],
      properties: {},
      required: [],
      'x-links': [link],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('keepTodos', () => {
    const schema = { ...common, 'x-todos': ['todo'], oneOf: [{ $ref: './Schema2.yaml' }] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {},
      oneOf: [{ $ref: './Schema2.yaml' }],
      properties: {},
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': ['todo'],
      'x-tags': []
    })
  })

  test('keepErrors', () => {
    const error: ImplementationError = { text: 'error', type: 'WRONG' }
    const schema = { ...common, 'x-errors': [error], oneOf: [{ $ref: './Schema2.yaml' }] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {},
      oneOf: [{ $ref: './Schema2.yaml' }],
      properties: {},
      required: [],
      'x-links': [],
      'x-errors': [error],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('keepTags', () => {
    const schema = { ...common, 'x-tags': [{ name: 'test', color: 'blue' }], oneOf: [{ $ref: './Schema2.yaml' }] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {},
      oneOf: [{ $ref: './Schema2.yaml' }],
      properties: {},
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': [{ name: 'test', color: 'blue' }]
    })
  })

  test('normalizeOneOf', () => {
    const schema = { ...common, oneOf: [{ $ref: './Schema2.yaml' }] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {},
      oneOf: [{ $ref: './Schema2.yaml' }],
      properties: {},
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeOneOf with properties', async () => {
    const schema = { ...common, oneOf: [{ $ref: './Schema2.yaml' }], properties: { deep: { type: 'object', properties: { key: { type: 'string' } } } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: { Deep: { type: 'object', properties: { key: { type: 'string' } }, required: [] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      oneOf: [{ $ref: './Schema2.yaml' }],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeOneOf dependencies', async () => {
    const schema = { ...common, oneOf: [{ type: 'object', properties: { key: { type: 'string' } } }] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: { Schema1: { type: 'object', properties: { key: { type: 'string' } }, required: [] } },
      oneOf: [{ $ref: '#/definitions/Schema1' }],
      properties: {},
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeProperties', async () => {
    const schema = { ...common, properties: { key: { type: 'string' } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {},
      properties: { key: { type: 'string' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeProperties with dependencies', async () => {
    const schema = { ...common, properties: { deep: { type: 'object', properties: { key: { type: 'string' } } } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: { Deep: { type: 'object', properties: { key: { type: 'string' } }, required: [] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeProperties with enum dependencies', async () => {
    const schema = { ...common, properties: { deep: { type: 'string', enum: ['A'] } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: { Deep: { type: 'string', enum: ['A'] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeProperties with oneOf dependencies', async () => {
    const schema = { ...common, properties: { deep: { type: 'object', oneOf: [{ $ref: './Schema2.yaml' }] } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: { Deep: { type: 'object', oneOf: [{ $ref: './Schema2.yaml' }], properties: {}, required: [] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('normalizeEnum', async () => {
    const schema = { ...common, type: 'string', enum: ['A'] }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      type: 'string',
      definitions: { },
      enum: ['A'],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('nested dependencies', async () => {
    const schema = { ...common, properties: { deep: { type: 'object', properties: { deepInternal: { type: 'object', properties: { key: { type: 'string' } } } } } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {
        DeepInternal: { type: 'object', properties: { key: { type: 'string' } }, required: [] },
        Deep: { type: 'object', properties: { deepInternal: { $ref: '#/definitions/DeepInternal' } }, required: [] }
      },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })

  test('nested oneOf dependencies', async () => {
    const schema = { ...common, properties: { deep: { type: 'object', properties: { deepInternal: { type: 'object', oneOf: [{ type: 'object', properties: { key: { type: 'string' } } }] } } } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {
        DeepInternal: { type: 'object', oneOf: [{ $ref: '#/definitions/DeepInternal1' }], properties: {}, required: [] },
        DeepInternal1: { type: 'object', properties: { key: { type: 'string' } }, required: [] },
        Deep: { type: 'object', properties: { deepInternal: { $ref: '#/definitions/DeepInternal' } }, required: [] }
      },
      properties: { deep: { $ref: '#/definitions/Deep' } },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })
  test('additionalProperties dependencies', async () => {
    const schema = { ...common, additionalProperties: { type: 'object', properties: { deepInternal: { type: 'object', oneOf: [{ type: 'object', properties: { key: { type: 'string' } } }] } } } }
    const result = normalizeSchema(schema)
    expect(result).toEqual({
      ...common,
      definitions: {
        DeepInternal: { type: 'object', oneOf: [{ $ref: '#/definitions/DeepInternal1' }], properties: {}, required: [] },
        DeepInternal1: { type: 'object', properties: { key: { type: 'string' } }, required: [] },
        AdditionalProperties: { type: 'object', properties: { deepInternal: { $ref: '#/definitions/DeepInternal' } }, required: [] }
      },
      properties: { },
      additionalProperties: { $ref: '#/definitions/AdditionalProperties' },
      required: [],
      'x-links': [],
      'x-errors': [],
      'x-todos': [],
      'x-tags': []
    })
  })
})
