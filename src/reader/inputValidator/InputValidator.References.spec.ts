import { InputValidator } from './InputValidator.ts'
import { type Application, type Module, type Schema } from '../Reader.ts'

describe('InputValidator.References', () => {
  let inputValidator: InputValidator
  const applicationFile: Application = { title: 'Title', description: 'Description' }
  const moduleFile: Module = { $id: '/Module', title: 'Module', description: 'Description' }
  const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }

  beforeEach(() => {
    inputValidator = new InputValidator()
  })

  test('valid reference in schema', () => {
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema2', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'object', $ref: './Schema.yaml' } } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateSchemaFile(schemaFile2)
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() }).not.toThrow()
  })

  test('invalid $ref reference', () => {
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema2', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'object', $ref: './Schema.yaml' } } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateSchemaFile(schemaFile2)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid Reference \'./Schema.yaml\' in Schema /Module/Schema2.yaml'))
  })

  test('invalid x-reference reference', () => {
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema2', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'string', 'x-references': './Schema.yaml' } } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateSchemaFile(schemaFile2)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid Reference \'./Schema.yaml\' in Schema /Module/Schema2.yaml'))
  })

  test('invalid x-references reference', () => {
    const schemaFile2: Schema = { $id: '/Module/Schema2.yaml', title: 'Schema2', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'string', 'x-references': ['./Schema.yaml'] } } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateSchemaFile(schemaFile2)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid Reference \'./Schema.yaml\' in Schema /Module/Schema2.yaml'))
  })

  test('valid reference in module', () => {
    const moduleFile2: Module = { $id: '/Module2', title: 'Module2', description: 'Description', operations: { $ref: '../Module/Schema.yaml' } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateModuleFile(moduleFile2)
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() }).not.toThrow()
  })

  test('invalid reference in module', () => {
    const moduleFile2: Module = { $id: '/Module2', title: 'Module2', description: 'Description', operations: { $ref: '../Module/Schema2.yaml' } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateModuleFile(moduleFile2)
    inputValidator.validateSchemaFile(schemaFile)
    expect(() => { inputValidator.finishValidation() })
      .toThrow(new Error('Invalid Reference \'../Module/Schema2.yaml\' in Module /Module2'))
  })

  test('valid reference over modules', () => {
    const schemaFile2: Schema = { $id: '/Module2/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key2: { type: 'object', $ref: '../Module/Schema.yaml' } } }
    inputValidator.validateApplicationFile(applicationFile)
    inputValidator.validateModuleFile(moduleFile)
    inputValidator.validateSchemaFile(schemaFile)
    inputValidator.validateSchemaFile(schemaFile2)
    expect(() => { inputValidator.finishValidation() }).not.toThrow()
  })
})
