import { InputNormalizer } from './InputNormalizer'
import { testApplication, testModule, testSchema } from '../testData'

describe('DefaultInputNormalizer', () => {
  let target: InputNormalizer

  beforeEach(() => {
    target = new InputNormalizer({
      ajvOptions: {},
      failOnNotSupportedProperties: true,
      discriminator: 'AJV',
      allowedFormats: [],
      allowedKeywords: [],
    })
  })

  test('addApplication success', () => {
    target.addApplication(testApplication(), 'file.yaml')
    target.toModel()
  })

  test('addApplication does validation', () => {
    expect(() => { target.addApplication({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('addApplication does normalization', () => {
    target.addApplication(testApplication(), 'file.yaml')
    const model = target.toModel()
    expect(model.application.errors).toEqual([])
  })

  test('addApplication must be called', () => {
    expect(() => { target.toModel() }).toThrow(new Error('No application file found'))
  })

  test('addModule success', () => {
    target.addApplication(testApplication(), 'file.yaml')
    target.addModule(testModule(), 'file.yaml')
    target.toModel()
  })

  test('addModule does validation', () => {
    target.addApplication(testApplication(), 'file.yaml')
    expect(() => { target.addModule({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('addModule does normalization', () => {
    target.addApplication(testApplication(), 'file.yaml')
    target.addModule(testModule(), 'file.yaml')
    const model = target.toModel()
    expect(model.modules[0].errors).toEqual([])
  })

  test('addSchema success', () => {
    target.addApplication(testApplication(), 'file.yaml')
    target.addModule(testModule(), 'file.yaml')
    target.addSchema(testSchema(), 'file.yaml')
    target.toModel()
  })

  test('addSchema does validation', () => {
    target.addApplication(testApplication(), 'file.yaml')
    target.addModule(testModule(), 'file.yaml')
    expect(() => { target.addSchema({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('addSchema does normalization', () => {
    target.addApplication(testApplication(), 'file.yaml')
    target.addModule(testModule(), 'file.yaml')
    target.addSchema(testSchema(), 'file.yaml')
    const model = target.toModel()
    expect(model.schemas[0]['x-errors']).toEqual([])
  })
})
