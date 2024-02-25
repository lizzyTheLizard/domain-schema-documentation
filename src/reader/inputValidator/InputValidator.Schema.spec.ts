import { InputValidator } from './InputValidator.ts'
import { type Schema } from '../input/Schema.ts'

describe('InputValidator.Schema', () => {
  let inputValidator: InputValidator

  beforeEach(() => {
    inputValidator = new InputValidator({ ajvOptions: { allErrors: true }, noAdditionalPropertiesInExamples: true, formats: [] })
  })

  test('valid schema file', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }
    expect(() => { inputValidator.validateSchemaFile(schemaFile) }).not.toThrow()
  })

  test('schema file with invalid schema', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'invalid', properties: { key: { type: 'number' } } } as unknown as Schema
    expect(() => { inputValidator.validateSchemaFile(schemaFile) })
      .toThrow(new Error('Invalid schema /Module/Schema.yaml: data/type must be equal to one of the allowed values, data/type must be array, data/type must match a schema in anyOf'))
  })

  test('schema file with missing enum documentation value', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'string', enum: ['key1', 'key2'], 'x-enum-description': { key1: 'value' } }
    expect(() => { inputValidator.validateSchemaFile(schemaFile) })
      .toThrow(new Error('Schema in /Module/Schema.yaml has an \'x-enum-description\' but is missing documentation for enum value \'key2\''))
  })

  test('schema file with additional enum documentation value', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'string', enum: ['key1', 'key2'], 'x-enum-description': { key1: 'value', key2: 'value', key3: 'value' } }
    expect(() => { inputValidator.validateSchemaFile(schemaFile) })
      .toThrow(new Error('Schema in /Module/Schema.yaml has an \'x-enum-description\' for enum value \'key3\' that does not exist'))
  })

  test('schema file with valid enum documentation', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'string', enum: ['key1', 'key2'], 'x-enum-description': { key1: 'value', key2: 'value' } }
    expect(() => { inputValidator.validateSchemaFile(schemaFile) }).not.toThrow()
  })

  test('schema file with undefined required', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, required: ['key2'] }
    expect(() => { inputValidator.validateSchemaFile(schemaFile) })
      .toThrow(new Error('Schema in /Module/Schema.yaml has a required property \'key2\' that is not defined'))
  })

  test('schema file with an defined required', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, required: ['key'] }
    expect(() => { inputValidator.validateSchemaFile(schemaFile) }).not.toThrow()
  })
})
