import { type Application, type Module, type Schema } from '../../reader/Model'
import { javaUpdator } from './JavaUpdator'

describe('JavaUpdator', () => {
  const application: Application = { title: 'Application', description: 'Application description' }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description' }
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {}
  }

  test('empty model', async () => {
    const model = { application, modules: [], schemas: [] }
    const target = javaUpdator()
    const result = await target(model)

    expect(result).toEqual(model)
  })

  test('module', async () => {
    const model = { application, modules: [module], schemas: [] }
    const target = javaUpdator()
    const result = await target(model)

    expect(result.modules[0].links).toEqual([{ text: 'Java-Files', href: './java' }])
  })

  test('schema', async () => {
    const model = { application, modules: [module], schemas: [schema] }
    const target = javaUpdator()
    const result = await target(model)

    expect(result.schemas[0]['x-links']).toEqual([{ text: 'Java-File', href: './java/Schema.java' }])
  })

  test('definitions', async () => {
    const schema2: Schema = { ...schema, definitions: { definition1: { type: 'object', properties: {}, required: [] } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const target = javaUpdator()
    const result = await target(model)

    expect(result.schemas[0]['x-links']).toEqual([{ text: 'Java-File', href: './java/Schema.java' }, { text: 'Java-File (definition1)', href: './java/SchemaDefinition1.java' }])
  })
})
