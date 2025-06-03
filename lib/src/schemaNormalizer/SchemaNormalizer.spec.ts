import { type JSONSchema7 } from 'json-schema'
import { SchemaNormalizer } from './SchemaNormalizer'

describe('SchemaNormalizer', () => {
  let target: SchemaNormalizer

  beforeEach(() => {
    target = new SchemaNormalizer({ allowedKeywords: ['extrakeyword'] })
  })

  test('$id', () => {
    expect(target.normalize({})).toMatchObject({ $id: 'Schema', title: 'Schema' })
    expect(target.getErrors()).toEqual([{ path: ['$id'], type: 'MISSING_REQUIRED_PROPERTY', message: 'Schema must define an ID' }])
    expect(target.normalize({ $id: '/Dir/Schema.end' })).toMatchObject({ $id: '/Dir/Schema.end', title: 'Schema' })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'SomeID' })).toMatchObject({ $id: 'SomeID', title: 'SomeID' })
    expect(target.getErrors()).toEqual([])
  })

  test('$schema', () => {
    expect(target.normalize({ $id: 'Schema', $schema: 'WRONG' })).toMatchObject({ $schema: 'WRONG' })
    expect(target.getErrors()).toEqual([{ path: ['$schema'], type: 'NOT_SUPPORTED_VALUE', message: 'Only \'http://json-schema.org/draft-07/schema#\' is supported', value: 'WRONG' }])
    expect(target.normalize({ $id: 'Schema', $schema: 'http://json-schema.org/draft-07/schema#' })).toMatchObject({ $schema: 'http://json-schema.org/draft-07/schema#' })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level additions', () => {
    expect(target.normalize({ $id: 'Schema', extrakeyword: 'test' } as unknown as JSONSchema7)).toMatchObject({ extrakeyword: 'test' })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ '$id': 'Schema', 'x-test': 'test' } as unknown as JSONSchema7)).toMatchObject({ 'x-test': 'test' })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', wrong: 'test' } as unknown as JSONSchema7)).not.toMatchObject({ wrong: 'test' })
    expect(target.getErrors()).toEqual([{ message: 'wrong is not supported for an schema of type object', path: ['wrong'], value: 'test', type: 'NOT_SUPPORTED_PROPERTY' }])
  })

  test('top-level definitions', () => {
    expect(target.normalize({ $id: 'Schema' })).toMatchObject({ definitions: {} })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', definitions: { name: false } })).toMatchObject({ definitions: { name: { type: 'object' } } })
    expect(target.getErrors()).toEqual([{ message: 'Only objects are supported', path: ['definitions', 'name'], value: false, type: 'NOT_SUPPORTED_VALUE' }])
    expect(target.normalize({ $id: 'Schema', definitions: { name: { type: 'string' } } })).toMatchObject({ definitions: { name: { type: 'string', enum: [] } } })
    expect(target.getErrors()).toEqual([{ message: 'Top-level string must be an enum', path: ['definitions', 'name', 'enum'], type: 'MISSING_REQUIRED_PROPERTY' }])
  })

  test('top-level oneOf', () => {
    expect(target.normalize({ $id: 'Schema', oneOf: [{ $ref: './Schema.yaml' }] })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'object',
      properties: {},
      additionalProperties: false,
      required: [],
      oneOf: [{ $ref: './Schema.yaml' }],
      definitions: {},
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level oneOf with properties', () => {
    expect(target.normalize({ $id: 'Schema', oneOf: [{ $ref: './Schema.yaml' }], properties: { key: { type: 'string' } } })).toMatchObject({
      properties: { key: { type: 'string' } },
      required: [],
      oneOf: [{ $ref: './Schema.yaml' }],
      definitions: {},
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level oneOf with dependencies', () => {
    expect(target.normalize({ $id: 'Schema', oneOf: [{ properties: { key: { type: 'string' } } }] })).toMatchObject({
      properties: { },
      required: [],
      oneOf: [{ $ref: '#/definitions/OneOf1' }],
      definitions: { OneOf1: { type: 'object', properties: { key: { type: 'string' } }, required: [] } },
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level properties', () => {
    expect(target.normalize({ $id: 'Schema', properties: { key: { type: 'string' } } })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'object',
      properties: { key: { type: 'string' } },
      required: [],
      additionalProperties: false,
      definitions: {},
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level properties with dependencies', () => {
    expect(target.normalize({ $id: 'Schema', properties: { deep: { type: 'object', properties: { key: { type: 'string' } } } } })).toMatchObject({
      definitions: { Deep: { type: 'object', properties: { key: { type: 'string' } } } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level properties with enum dependencies', () => {
    expect(target.normalize({ $id: 'Schema', properties: { deep: { type: 'string', enum: ['A'] } } })).toMatchObject({
      definitions: { Deep: { type: 'string', enum: ['A'] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level properties with oneOf dependencies', () => {
    expect(target.normalize({ $id: 'Schema', properties: { deep: { type: 'object', oneOf: [{ $ref: './Schema2.yaml' }] } } })).toMatchObject({
      definitions: { Deep: { oneOf: [{ $ref: './Schema2.yaml' }] } },
      properties: { deep: { $ref: '#/definitions/Deep' } },
    })
    expect(target.getErrors()).toEqual([])
  })

  test('top-level enum', () => {
    expect(target.normalize({ $id: 'Schema', type: 'string', enum: ['A'] })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'string',
      definitions: { },
      enum: ['A'],
    })
    expect(target.getErrors()).toEqual([])
  })

  test('additionalProperties', () => {
    expect(target.normalize({ $id: 'Schema' })).toMatchObject({ additionalProperties: false })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', additionalProperties: false })).toMatchObject({ additionalProperties: false })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', additionalProperties: true })).toMatchObject({ additionalProperties: true })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', additionalProperties: { type: 'string' } })).toMatchObject({ additionalProperties: { type: 'string' } })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', additionalProperties: { type: 'string', enum: ['A'] } })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: { $ref: '#/definitions/AdditionalProperties' },
      definitions: { AdditionalProperties: { type: 'string', enum: ['A'] } },
    })
    expect(target.getErrors()).toEqual([])
  })

  test('map', () => {
    expect(target.normalize({ $id: 'Schema', properties: { map: { additionalProperties: true } } })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'object',
      properties: { map: { type: 'object', additionalProperties: true } },
      required: [],
      additionalProperties: false,
      definitions: {},
    })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', properties: { map: { additionalProperties: { type: 'string' } } } })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'object',
      properties: { map: { type: 'object', additionalProperties: { type: 'string' } } },
      required: [],
      additionalProperties: false,
      definitions: {},
    })
    expect(target.getErrors()).toEqual([])
    expect(target.normalize({ $id: 'Schema', properties: { map: { additionalProperties: { type: 'object', properties: { key: { type: 'string' } } } } } })).toEqual({
      $id: 'Schema',
      title: 'Schema',
      type: 'object',
      properties: { map: { type: 'object', additionalProperties: { $ref: '#/definitions/MapAdditionalProperties' } } },
      required: [],
      additionalProperties: false,
      definitions: { MapAdditionalProperties: { type: 'object', properties: { key: { type: 'string' } }, required: [], additionalProperties: false } },
    })
    expect(target.getErrors()).toEqual([])
  })
})
