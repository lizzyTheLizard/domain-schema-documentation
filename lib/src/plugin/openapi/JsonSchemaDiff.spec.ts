import { type OpenAPIV3 } from 'openapi-types'
import { jsonSchemaDiff } from './JsonSchemaDiff'

describe('JsonSchemaDiff', () => {
  test('Equal Schemas', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([])
  })

  test('Property Added', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' }, key2: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'key2\' must not exist'])
  })

  test('Property Removed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' }, key2: { type: 'string' } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'key2\' must exist'])
  })

  test('Property type changed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'number' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type of \'key\' must be \'string\' but is \'number\''])
  })

  test('Enum value changed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string', enum: ['A'] } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string', enum: ['B'] } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([
      'Enum \'key\' must contain value "A"',
      'Enum \'key\' must not contain value "B"',
    ])
  })

  test('Required added', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } }, required: ['key'] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'key\' must not be required'])
  })

  test('Required removed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } }, required: ['key'] }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'key\' must be required'])
  })

  test('Ignore additions', () => {
    const source: OpenAPIV3.SchemaObject = { 'properties': { key: { type: 'string' } }, 'x-SOMETHING': 'test' } as unknown as OpenAPIV3.SchemaObject
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([])
  })

  test('Sub-Property Added', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'object', properties: { key: { type: 'string' } } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'sub.key2\' must not exist'])
  })

  test('Sub-Property Removed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'object', properties: { key: { type: 'string' } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'sub.key2\' must exist'])
  })

  test('Sub-Property type changed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'object', properties: { key: { type: 'string' } } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'object', properties: { key: { type: 'number' } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type of \'sub.key\' must be \'string\' but is \'number\''])
  })

  test('Array-Property Added', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } } } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'sub[].key2\' must not exist'])
  })

  test('Array-Property Removed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'sub[].key2\' must exist'])
  })

  test('Array-Property type changed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } } } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'number' } } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type of \'sub[].key\' must be \'string\' but is \'number\''])
  })

  test('Array type changed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'string' } } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { sub: { type: 'array', items: { type: 'number' } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type of \'sub[]\' must be \'string\' but is \'number\''])
  })

  test('OneOf added', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } }, oneOf: [{ type: 'string' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type must not be OneOf'])
  })

  test('OneOf removed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } }, oneOf: [{ type: 'string' }] }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type must be OneOf'])
  })

  test('OneOf option added', () => {
    const source: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }] }
    const dest: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type must have 2 instead of 3 OneOf options'])
  })

  test('OneOf option removed', () => {
    const source: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
    const dest: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type must have 3 instead of 2 OneOf options'])
  })

  test('OneOf option changed', () => {
    const source: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
    const dest: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type of \'OneOf[2]\' must be \'boolean\' but is \'object\''])
  })

  test('OneOf option property added', () => {
    const source: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' } } }] }
    const dest: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'OneOf[2].key2\' must not exist'])
  })

  test('OneOf option property removed', () => {
    const source: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' } } }] }
    const dest: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Property \'OneOf[2].key2\' must not exist'])
  })

  test('OneOf option property changed', () => {
    const source: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' } } }] }
    const dest: OpenAPIV3.SchemaObject = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'number' } } }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['Type of \'OneOf[2].key\' must be \'string\' but is \'number\''])
  })

  test('Sub-OneOf removed', () => {
    const source: OpenAPIV3.SchemaObject = { properties: { key: { type: 'object', oneOf: [{ type: 'string' }] } } }
    const dest: OpenAPIV3.SchemaObject = { properties: { key: { type: 'object' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual(['\'key\' must be OneOf'])
  })
})
