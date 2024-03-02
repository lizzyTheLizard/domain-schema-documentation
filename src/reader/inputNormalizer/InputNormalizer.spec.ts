import { inputNormalizer } from './InputNormalizer.ts'
import { type SchemaCommon } from '../input/Schema.ts'

const testSchema: SchemaCommon = { $id: 'test', type: 'object', 'x-schema-type': 'Aggregate' }

describe('InputNormalizer', () => {
  test('flat interface', async () => {
    const schema = {
      ...testSchema,
      oneOf: [{ type: 'object', $ref: 'test2' }, { type: 'object', $ref: 'test3' }]
    }
    const result = inputNormalizer(schema as SchemaCommon)
    expect(result).toEqual({
      ...testSchema,
      oneOf: [{ type: 'object', $ref: 'test2' }, { type: 'object', $ref: 'test3' }]
    })
  })

  test('interface with subSchemas', async () => {
    const schema = {
      ...testSchema,
      oneOf: [{ type: 'object', properties: { key: { type: 'string' } } }, { type: 'object', $ref: 'test3' }]
    }
    const result = inputNormalizer(schema as SchemaCommon)
    expect(result).toEqual({
      ...testSchema,
      oneOf: [{ type: 'object', $ref: '#/definitions/OneOfTest1' }, { type: 'object', $ref: 'test3' }],
      definitions: { OneOfTest1: { type: 'object', required: [], properties: { key: { type: 'string' } } } }
    })
  })

  test('interface with subSchemas and definitions', async () => {
    const schema = {
      ...testSchema,
      oneOf: [{ type: 'object', properties: { key: { type: 'string' } } }, { type: 'object', $ref: 'test3' }],
      definitions: { test: { type: 'string' } }
    }
    const result = inputNormalizer(schema as SchemaCommon)
    expect(result).toEqual({
      ...testSchema,
      oneOf: [{ type: 'object', $ref: '#/definitions/OneOfTest1' }, { type: 'object', $ref: 'test3' }],
      definitions: { OneOfTest1: { type: 'object', required: [], properties: { key: { type: 'string' } } }, test: { type: 'string' } }
    })
  })

  test('properties with subSchemas', async () => {
    const schema = {
      ...testSchema,
      properties: {
        key: { type: 'object', properties: { key1: { type: 'string' } } },
        value: { type: 'string' }
      }
    }
    const result = inputNormalizer(schema as SchemaCommon)
    expect(result).toEqual({
      ...testSchema,
      required: [],
      properties: { key: { type: 'object', $ref: '#/definitions/TestKey' }, value: { type: 'string' } },
      definitions: { TestKey: { type: 'object', required: [], properties: { key1: { type: 'string' } } } }
    })
  })

  test('properties with subSubSchemas enum', async () => {
    const schema = {
      ...testSchema,
      properties: {
        key: {
          type: 'object',
          properties: {
            key1: { type: 'string' },
            key2: { type: 'string', enum: ['A', 'B'] }
          }
        },
        value: { type: 'string' }
      }
    }
    const result = inputNormalizer(schema as SchemaCommon)
    expect(result).toEqual({
      ...testSchema,
      properties: { key: { type: 'object', $ref: '#/definitions/TestKey' }, value: { type: 'string' } },
      required: [],
      definitions: {
        TestKey: { type: 'object', required: [], properties: { key1: { type: 'string' }, key2: { type: 'object', $ref: '#/definitions/TestKeyKey2' } } },
        TestKeyKey2: { type: 'string', enum: ['A', 'B'] }
      }
    })
  })

  test('properties with subSubSchemas oneOf', async () => {
    const schema = {
      ...testSchema,
      properties: {
        key: {
          type: 'object',
          properties: {
            key1: { type: 'string' },
            key2: {
              type: 'object',
              oneOf: [
                { type: 'object', $ref: 'OtherSchema1' },
                { type: 'object', $ref: 'OtherSchema2' }
              ]
            }
          }
        },
        value: { type: 'string' }
      }
    }
    const result = inputNormalizer(schema as SchemaCommon)
    expect(result).toEqual({
      ...testSchema,
      properties: { key: { type: 'object', $ref: '#/definitions/TestKey' }, value: { type: 'string' } },
      required: [],
      definitions: {
        TestKey: { type: 'object', required: [], properties: { key1: { type: 'string' }, key2: { type: 'object', $ref: '#/definitions/TestKeyKey2' } } },
        TestKeyKey2: {
          type: 'object',
          oneOf: [
            { type: 'object', $ref: 'OtherSchema1' },
            { type: 'object', $ref: 'OtherSchema2' }
          ]
        }
      }
    })
  })
})
