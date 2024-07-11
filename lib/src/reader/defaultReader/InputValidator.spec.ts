import { type Schema } from '../Reader'
import { InputValidator, type InputValidatorOptions } from './InputValidator'

const inputValidatorOptions: InputValidatorOptions = {
  ajvOptions: {},
  allowAdditionalPropertiesInExamples: 'INTERFACE',
  discriminator: 'AJV',
  allowedFormats: [],
  allowedKeywords: []
}

describe('InputValidator', () => {
  let target: InputValidator

  beforeEach(() => {
    target = new InputValidator(inputValidatorOptions)
  })

  test('validateApplicationFile', async () => {
    const applicationFile = { title: 'Title', description: 'Description' }
    expect(() => { target.validateApplicationFile({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(target.validateApplicationFile(applicationFile, 'file.yaml')).toBe(applicationFile)
  })

  test('validateModuleFile', async () => {
    const moduleFile = { $id: '/Module', title: 'Module', description: 'Description' }
    expect(() => { target.validateModuleFile({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(target.validateModuleFile(moduleFile, 'file.yaml')).toBe(moduleFile)
  })

  test('validateSchemaFile', async () => {
    const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }
    expect(() => { target.validateSchemaFile({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(target.validateSchemaFile(schemaFile, 'file.yaml')).toBe(schemaFile)
  })

  test('validateId', async () => {
    const moduleFile = { $id: '/Module', title: 'Module', description: 'Description' }
    const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }
    expect(() => { target.validateModuleFile(moduleFile, 'file.yaml', 'otherId') }).toThrow(new Error(`Invalid file file.yaml. Id must be the same as the file path 'otherId' but is '${moduleFile.$id}'`))
    expect(() => { target.validateSchemaFile(schemaFile, 'file.yaml', 'otherId') }).toThrow(new Error(`Invalid file file.yaml. Id must be the same as the file path 'otherId' but is '${schemaFile.$id}'`))
    expect(() => { target.validateModuleFile(moduleFile, 'file.yaml', moduleFile.$id) }).not.toThrow()
    expect(() => { target.validateSchemaFile(schemaFile, 'file.yaml', schemaFile.$id) }).not.toThrow()
  })

  test('validateEnum', async () => {
    const enumSchemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'string', enum: ['A'] }
    expect(() => { target.validateSchemaFile({ ...enumSchemaFile, 'x-enum-description': { A: 'doc', B: 'doc' } }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. It has an enum description for \'B\' which is not part of the enum'))
    expect(() => { target.validateSchemaFile({ ...enumSchemaFile, 'x-enum-description': { } }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. It has an enum description but no description for value \'A\''))
    expect(() => { target.validateSchemaFile(enumSchemaFile, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...enumSchemaFile, 'x-enum-description': { A: 'doc' } }, 'file.yaml') }).not.toThrow()
  })

  test('validate additional Properties', () => {
    const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }
    expect(() => { target.validateSchemaFile({ ...schemaFile, additionalProperties: true }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schemaFile, additionalProperties: false }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schemaFile, additionalProperties: {} }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schemaFile, additionalProperties: { type: 'string' } }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schemaFile, additionalProperties: { type: 'object', additionalProperties: true } }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schemaFile, additionalProperties: 'string' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('validateRequired', async () => {
    const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }
    expect(() => { target.validateSchemaFile({ ...schemaFile, required: ['other'] }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. It has a required property \'other\' that is not defined'))
    expect(() => { target.validateSchemaFile(schemaFile, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schemaFile, required: ['key'] }, 'file.yaml') }).not.toThrow()
  })

  test('validateExamples', async () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, definitions: {}, 'x-errors': [], 'x-links': [], 'x-todos': [], required: [] }
    target.addSchemaToAjv(schemaFile)
    expect(() => { target.validateExamples({ ...schemaFile, examples: [{ wrong: 1 }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema.yaml\'. See logs for details'))
    expect(() => { target.validateExamples(schemaFile) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schemaFile, examples: [{ key: 1 }] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schemaFile, examples: [{ key: 1, additional: 'test' }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema.yaml\'. See logs for details'))
  })

  test('validateExamples additional Properties allowed', async () => {
    target = new InputValidator({ ...inputValidatorOptions, allowAdditionalPropertiesInExamples: 'ALWAYS' })
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, definitions: {}, 'x-errors': [], 'x-links': [], 'x-todos': [], required: [] }
    target.addSchemaToAjv(schemaFile)
    expect(() => { target.validateExamples({ ...schemaFile, examples: [{ key: 1 }] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schemaFile, examples: [{ key: 1, additional: 'test' }] }) }).not.toThrow()
  })

  test('validateReferences', async () => {
    const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { ref: { $ref: './Schema2.yaml' } }, definitions: {}, 'x-errors': [], 'x-links': [], 'x-todos': [], required: [] }
    target.addSchemaToAjv(schemaFile)
    expect(() => { target.validateReferences(schemaFile, schemaFile) }).toThrow(new Error('Invalid Reference \'./Schema2.yaml\' in Schema \'/Module/Schema.yaml\''))
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } }, definitions: {}, 'x-errors': [], 'x-links': [], 'x-todos': [], required: [] }
    target.addSchemaToAjv(schemaFile2)
    expect(() => { target.validateReferences(schemaFile, schemaFile) }).not.toThrow()
  })

  test('validate discriminator', () => {
    const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { field1: { type: 'string', const: 'T1' }, field2: { type: 'string' } }, definitions: {}, 'x-errors': [], 'x-links': [], 'x-todos': [], required: ['field1'] } as any as Schema
    const intSchema = { $id: '/Module/Schema2.yaml', title: 'Schema2', 'x-schema-type': 'Aggregate', type: 'object', discriminator: { propertyName: 'field1' }, oneOf: [{ $ref: './Schema.yaml' }], properties: { field1: { type: 'string' } }, definitions: {}, 'x-errors': [], 'x-links': [], 'x-todos': [] } as any as Schema
    target.addSchemaToAjv(schemaFile)
    expect(() => { target.addSchemaToAjv(intSchema) }).not.toThrow()
    expect(() => { target.validateExamples({ ...intSchema, examples: [{ wrong: 1 }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema2.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...intSchema, examples: [{ field1: 'T1' }] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...intSchema, examples: [{ field1: 'T2' }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema2.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...intSchema, examples: [{ field1: 'T1', wrong: 1 }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema2.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...intSchema, examples: [{ field1: 'T1', field2: 'something' }] }) }).not.toThrow()
  })
})
