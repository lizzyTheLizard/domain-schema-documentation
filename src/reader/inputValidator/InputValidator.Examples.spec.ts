import { InputValidator } from './InputValidator.ts'
import { type Application } from '../input/Input.ts'
import { type Schema } from '../input/Schema.ts'

const applicationFile: Application = { title: 'Title', description: 'Description' }

describe('InputValidator.Examples', () => {
  let inputValidator: InputValidator

  beforeEach(() => {
    inputValidator = new InputValidator({ noAdditionalPropertiesInExamples: true, ajvOptions: {}, formats: [] })
    inputValidator.validateApplicationFile(applicationFile)
  })

  test('valid example', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, examples: [{ key: 27 }], required: [], definitions: {} }
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() }).not.toThrow()
  })

  test('invalid example', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, examples: [{ key: 'value' }], required: [], definitions: {} }
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid example [0] in Schema /Module/Schema.yaml: data/key must be number'))
  })

  test('invalid additional properties in example', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, examples: [{ key: 2, key2: 'value' }], required: [], definitions: {} }
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid example [0] in Schema /Module/Schema.yaml: data must NOT have additional properties'))
  })

  test('valid additional properties in example', () => {
    inputValidator = new InputValidator({ noAdditionalPropertiesInExamples: false, ajvOptions: {}, formats: [] })
    inputValidator.validateApplicationFile(applicationFile)
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, examples: [{ key: 2, key2: 'value' }], required: [], definitions: {} }
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() }).not.toThrow()
  })

  test('valid example with reference over module', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'object', $ref: './Schema2.yaml' } }, examples: [{ key: { key2: 2 } }], required: [], definitions: {} }
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'number' } }, required: [], definitions: {} }
    inputValidator.validateSchemaFile(schemaFile2)
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() }).not.toThrow()
  })

  test('invalid example with reference over module', () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'object', $ref: './Schema2.yaml' } }, examples: [{ key: { key2: 'value' } }], required: [], definitions: {} }
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'number' } }, required: [], definitions: {} }
    inputValidator.validateSchemaFile(schemaFile2)
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid example [0] in Schema /Module/Schema.yaml: data/key/key2 must be number'))
  })
})
