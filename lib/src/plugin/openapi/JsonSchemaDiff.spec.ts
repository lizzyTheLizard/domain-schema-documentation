import { jsonSchemaDiff } from './JsonSchemaDiff'

describe('JsonSchemaDiff', () => {
  test('Equal Schemas', () => {
    const source = { properties: { key: { type: 'string' } } }
    const dest = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([])
  })

  test('Property Added', () => {
    const source = { properties: { key: { type: 'string' } } }
    const dest = { properties: { key: { type: 'string' }, key2: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'key2\' must not exist', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('Property Removed', () => {
    const source = { properties: { key: { type: 'string' }, key2: { type: 'string' } } }
    const dest = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'key2\' must exist', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Property type changed', () => {
    const source = { properties: { key: { type: 'string' } } }
    const dest = { properties: { key: { type: 'number' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type of \'key\' must be \'string\' but is \'number\'', type: 'WRONG' }])
  })

  test('Enum value changed', () => {
    const source = { properties: { key: { type: 'string', enum: ['A'] } } }
    const dest = { properties: { key: { type: 'string', enum: ['B'] } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([
      { text: 'Enum \'key\' must contain value "A"', type: 'MISSING_IN_IMPLEMENTATION' },
      { text: 'Enum \'key\' must not contain value "B"', type: 'NOT_IN_DOMAIN_MODEL' }
    ])
  })

  test('Ignore additions', () => {
    const source = { properties: { key: { type: 'string' } }, 'x-SOMETHING': 'test' }
    const dest = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([])
  })

  test('Sub-Property Added', () => {
    const source = { properties: { sub: { type: 'object', properties: { key: { type: 'string' } } } } }
    const dest = { properties: { sub: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'sub.key2\' must not exist', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('Sub-Property Removed', () => {
    const source = { properties: { sub: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } }
    const dest = { properties: { sub: { type: 'object', properties: { key: { type: 'string' } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'sub.key2\' must exist', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Sub-Property type changed', () => {
    const source = { properties: { sub: { type: 'object', properties: { key: { type: 'string' } } } } }
    const dest = { properties: { sub: { type: 'object', properties: { key: { type: 'number' } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type of \'sub.key\' must be \'string\' but is \'number\'', type: 'WRONG' }])
  })

  test('Array-Property Added', () => {
    const source = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } } } } } }
    const dest = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'sub[].key2\' must not exist', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('Array-Property Removed', () => {
    const source = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } } } } }
    const dest = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'sub[].key2\' must exist', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Array-Property type changed', () => {
    const source = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' } } } } } }
    const dest = { properties: { sub: { type: 'array', items: { type: 'object', properties: { key: { type: 'number' } } } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type of \'sub[].key\' must be \'string\' but is \'number\'', type: 'WRONG' }])
  })

  test('Array type changed', () => {
    const source = { properties: { sub: { type: 'array', items: { type: 'string' } } } }
    const dest = { properties: { sub: { type: 'array', items: { type: 'number' } } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type of \'sub[]\' must be \'string\' but is \'number\'', type: 'WRONG' }])
  })

  test('OneOf added', () => {
    const source = { properties: { key: { type: 'string' } } }
    const dest = { properties: { key: { type: 'string' } }, oneOf: [{ type: 'string' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type must not be OneOf', type: 'WRONG' }])
  })

  test('OneOf removed', () => {
    const source = { properties: { key: { type: 'string' } }, oneOf: [{ type: 'string' }] }
    const dest = { properties: { key: { type: 'string' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type must be OneOf', type: 'WRONG' }])
  })

  test('OneOf option added', () => {
    const source = { oneOf: [{ type: 'string' }, { type: 'number' }] }
    const dest = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type must have 2 instead of 3 OneOf options', type: 'WRONG' }])
  })

  test('OneOf option removed', () => {
    const source = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
    const dest = { oneOf: [{ type: 'string' }, { type: 'number' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type must have 3 instead of 2 OneOf options', type: 'WRONG' }])
  })

  test('OneOf option changed', () => {
    const source = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] }
    const dest = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object' }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type of \'OneOf[2]\' must be \'boolean\' but is \'object\'', type: 'WRONG' }])
  })

  test('OneOf option property added', () => {
    const source = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' } } }] }
    const dest = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'OneOf[2].key2\' must not exist', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('OneOf option property removed', () => {
    const source = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' } } }] }
    const dest = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'string' } } }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Property \'OneOf[2].key2\' must not exist', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('OneOf option property changed', () => {
    const source = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'string' } } }] }
    const dest = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'object', properties: { key: { type: 'number' } } }] }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: 'Type of \'OneOf[2].key\' must be \'string\' but is \'number\'', type: 'WRONG' }])
  })

  test('Sub-OneOf removed', () => {
    const source = { properties: { key: { type: 'object', oneOf: [{ type: 'string' }] } } }
    const dest = { properties: { key: { type: 'object' } } }
    const result = jsonSchemaDiff(source, dest)
    expect(result).toEqual([{ text: '\'key\' must be OneOf', type: 'WRONG' }])
  })
})
