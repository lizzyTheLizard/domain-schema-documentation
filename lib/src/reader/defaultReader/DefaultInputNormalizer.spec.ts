import { type InputNormalizer } from './InputNormalizer'
import { defaultInputNormalizer } from './DefaultInputNormalizer'

const applicationFile = { title: 'Title', description: 'Description' }
const moduleFile = { $id: '/Module', title: 'Module', description: 'Description' }
const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }

describe('DefaultInputNormalizer', () => {
  let target: InputNormalizer

  beforeEach(() => {
    target = defaultInputNormalizer({
      ajvOptions: {},
      allowAdditionalPropertiesInExamples: 'INTERFACE',
      discriminator: 'AJV',
      allowedFormats: [],
      allowedKeywords: []
    })
  })

  test('addApplication success', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.toModel()
  })

  test('addApplication does validation', async () => {
    expect(() => { target.addApplication({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('addApplication does normalization', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    const model = target.toModel()
    expect(model.application.errors).toEqual([])
  })

  test('addApplication must be called', async () => {
    expect(() => { target.toModel() }).toThrow(new Error('No application file found'))
  })

  test('addModule success', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.toModel()
  })

  test('addModule does validation', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    expect(() => { target.addModule({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('addModule does normalization', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    const model = target.toModel()
    expect(model.modules[0].errors).toEqual([])
  })

  test('addSchema success', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(schemaFile, 'file.yaml')
    target.toModel()
  })

  test('addSchema does validation', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    expect(() => { target.addSchema({ wrong: 'field' }, 'file.yaml') }).toThrow(new Error('Invalid file file.yaml. See logs for details'))
  })

  test('addSchema does normalization', async () => {
    target.addApplication(applicationFile, 'file.yaml')
    target.addModule(moduleFile, 'file.yaml')
    target.addSchema(schemaFile, 'file.yaml')
    const model = target.toModel()
    expect(model.schemas[0]['x-errors']).toEqual([])
  })
})
