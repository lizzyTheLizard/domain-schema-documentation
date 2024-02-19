import { InputValidator } from './InputValidator.ts'
import { type Application } from '../Reader.ts'

describe('InputValidator.Application', () => {
  let inputValidator: InputValidator

  beforeEach(() => {
    inputValidator = new InputValidator()
  })

  test('valid application file', () => {
    const applicationFile: Application = { title: 'Title', description: 'Description' }
    expect(() => { inputValidator.validateApplicationFile(applicationFile) }).not.toThrow()
  })

  test('application file with invalid schema', () => {
    const applicationFile = { wrong: 'field' } as unknown as Application
    expect(() => { inputValidator.validateApplicationFile(applicationFile) })
      .toThrow(new Error('Invalid application file: data must have required property \'title\', data must have required property \'description\''))
  })

  test('missing application file', () => {
    expect(() => { inputValidator.finishValidation() }).toThrow(new Error('No application file found'))
  })
})
