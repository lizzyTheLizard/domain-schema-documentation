import { type Schema } from '../Reader'
import { InputValidator, type InputValidatorOptions } from './InputValidator'
import { testSchema, testApplication, testModule, testEnumSchema, testInterfaceSchema } from '../../testData'

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
    const application = testApplication()
    expect(() => { target.validateApplicationFile({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(target.validateApplicationFile(application, 'file.yaml')).toBe(application)
  })

  test('validateModuleFile', async () => {
    const module = testModule()
    expect(() => { target.validateModuleFile({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(target.validateModuleFile(module, 'file.yaml')).toBe(module)
  })

  test('validateSchemaFile', async () => {
    const schema = testSchema()
    expect(() => { target.validateSchemaFile({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(target.validateSchemaFile(schema, 'file.yaml')).toBe(schema)
  })

  test('validateId', async () => {
    const module = testModule()
    const schema = testSchema()
    expect(() => { target.validateModuleFile(module, 'file.yaml', 'otherId') }).toThrow(new Error(`Invalid file file.yaml. Id must be the same as the file path 'otherId' but is '${module.$id}'`))
    expect(() => { target.validateSchemaFile(schema, 'file.yaml', 'otherId') }).toThrow(new Error(`Invalid file file.yaml. Id must be the same as the file path 'otherId' but is '${schema.$id}'`))
    expect(() => { target.validateModuleFile(module, 'file.yaml', module.$id) }).not.toThrow()
    expect(() => { target.validateSchemaFile(schema, 'file.yaml', schema.$id) }).not.toThrow()
  })

  test('validateEnum', async () => {
    const schema = testEnumSchema()
    expect(() => { target.validateSchemaFile({ ...schema, 'x-enum-description': { A: 'doc', B: 'doc' } }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. It has an enum description for \'B\' which is not part of the enum'))
    expect(() => { target.validateSchemaFile({ ...schema, 'x-enum-description': { } }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. It has an enum description but no description for value \'A\''))
    expect(() => { target.validateSchemaFile({ ...schema, 'x-enum-description': undefined }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, 'x-enum-description': { A: 'doc' } }, 'file.yaml') }).not.toThrow()
  })

  test('validate additional Properties', () => {
    const schema = testSchema()
    expect(() => { target.validateSchemaFile({ ...schema, additionalProperties: true }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, additionalProperties: false }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, additionalProperties: {} }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, additionalProperties: { type: 'string' } }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, additionalProperties: { type: 'object', additionalProperties: true } }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, additionalProperties: 'string' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('validateRequired', async () => {
    const schema = testSchema()
    expect(() => { target.validateSchemaFile({ ...schema, required: ['other'] }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. It has a required property \'other\' that is not defined'))
    expect(() => { target.validateSchemaFile(schema, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, required: ['key'] }, 'file.yaml') }).not.toThrow()
  })

  test('validateExamples', async () => {
    const schema = testSchema()
    target.addSchemaToAjv(schema)
    expect(() => { target.validateExamples({ ...schema, examples: [{ wrong: 1 }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...schema, examples: undefined }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schema, examples: [] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schema, examples: [{ key: 1 }] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schema, examples: [{ key: 1, additional: 'test' }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Schema.yaml\'. See logs for details'))
  })

  test('validateExamples additional Properties allowed', async () => {
    const schema = testSchema()
    target = new InputValidator({ ...inputValidatorOptions, allowAdditionalPropertiesInExamples: 'ALWAYS' })
    target.addSchemaToAjv(schema)
    expect(() => { target.validateExamples({ ...schema, examples: [{ key: 1 }] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schema, examples: [{ key: 1, additional: 'test' }] }) }).not.toThrow()
  })

  test('validateReferences', async () => {
    const schema = testSchema()
    const schema2 = { ...testSchema(), $id: '/Module/Schema2.yaml', properties: { ref: { $ref: './Schema.yaml' } } }
    target.addSchemaToAjv(schema2)
    expect(() => { target.validateReferences(schema2, schema2) }).toThrow(new Error('Invalid Reference \'./Schema.yaml\' in Schema \'/Module/Schema2.yaml\''))
    target.addSchemaToAjv(schema)
    expect(() => { target.validateReferences(schema2, schema2) }).not.toThrow()
  })

  test('validate discriminator', () => {
    const schema: Schema = { ...testSchema(), properties: { field1: { type: 'string', const: 'T1' }, field2: { type: 'string' } }, required: ['field1'] } as any
    const schema2 = testInterfaceSchema()
    target.addSchemaToAjv(schema)
    expect(() => { target.addSchemaToAjv(schema2) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schema2, examples: [{ wrong: 1 }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Interface.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...schema2, examples: [{ field1: 'T1' }] }) }).not.toThrow()
    expect(() => { target.validateExamples({ ...schema2, examples: [{ field1: 'T2' }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Interface.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...schema2, examples: [{ field1: 'T1', wrong: 1 }] }) }).toThrow(new Error('Invalid example 0 in Schema \'/Module/Interface.yaml\'. See logs for details'))
    expect(() => { target.validateExamples({ ...schema2, examples: [{ field1: 'T1', field2: 'something' }] }) }).not.toThrow()
  })

  test('x-schema-type', () => {
    const schema = testSchema()
    expect(() => { target.validateSchemaFile({ ...schema, 'x-schema-type': 'Aggregate' }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, 'x-schema-type': undefined }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(() => { target.validateSchemaFile({ ...schema, 'x-schema-type': 2 }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
    expect(() => { target.validateSchemaFile({ ...schema, 'x-schema-type': 'WRONG' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('validate consts', () => {
    const schema: Schema = testSchema()
    expect(() => { target.validateSchemaFile({ ...schema, properties: { key: { type: 'string', const: 2 } } }, 'file.yaml') }).toThrow(new Error('Invalid constant 2 in file.yaml. See logs for details'))
    expect(() => { target.validateSchemaFile({ ...schema, properties: { key: { const: 2 } } }, 'file.yaml') }).toThrow(new Error('Invalid constant 2 in file.yaml. Constants are only supported for basic properties'))
    expect(() => { target.validateSchemaFile({ ...schema, properties: { key: { type: 'object', properties: {}, additionalProperties: true, const: { key: 'value' } } } }, 'file.yaml') }).toThrow(new Error('Invalid constant {"key":"value"} in file.yaml. Constants are only supported for basic properties'))
    expect(() => { target.validateSchemaFile({ ...schema, properties: { key: { type: 'string', const: 'test' } } }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, properties: { key: { type: 'integer', const: 2 } } }, 'file.yaml') }).not.toThrow()
    expect(() => { target.validateSchemaFile({ ...schema, properties: { key: { type: 'number', const: 3 } } }, 'file.yaml') }).not.toThrow()
  })
})
