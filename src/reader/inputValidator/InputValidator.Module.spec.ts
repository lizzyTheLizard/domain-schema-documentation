import { InputValidator } from './InputValidator.ts'
import { type Module } from '../input/Input.ts'

describe('InputValidator.Module', () => {
  let inputValidator: InputValidator

  beforeEach(() => {
    inputValidator = new InputValidator({ noAdditionalPropertiesInExamples: true, ajvOptions: {}, formats: [] })
  })

  test('valid module file', () => {
    const moduleFile: Module = { $id: '/Module', title: 'Module', description: 'Description' }
    expect(() => { inputValidator.validateModuleFile(moduleFile) }).not.toThrow()
  })

  test('module file with invalid schema', () => {
    const moduleFile: Module = { $id: '/Module', title: 'Module', description: 3 } as unknown as Module
    expect(() => { inputValidator.validateModuleFile(moduleFile) })
      .toThrow(new Error('Invalid module /Module: data/description must be string'))
  })
})
