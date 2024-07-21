import * as tmp from 'tmp'
import { type ModuleWithOpenApi, OpenAPIGenerator } from './OpenApiGenerator'
import { testInterfaceSchema, testModel, testModule, testSchema } from '../../testData'
import { fullSpec, refSpec, refSpecInterface } from './testData'

describe('OpenAPIGenerator', () => {
  let tmpDir: tmp.DirResult
  let target: OpenAPIGenerator

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = new OpenAPIGenerator(testModel(), tmpDir.name)
  })

  test('fill default values', async () => {
    const module: ModuleWithOpenApi = { ...testModule(), openApi: {} }
    const result = await target.generate(module)
    expect(result).toEqual({
      openapi: '3.0.3',
      info: { title: module.title, description: module.description, version: new Date().toDateString() },
      servers: [],
      paths: {},
      components: { schemas: {}, securitySchemes: {} }
    })
  })

  test('overwrite defaults if given', async () => {
    const openApi = fullSpec()
    const module: ModuleWithOpenApi = { ...testModule(), openApi }
    const result = await target.generate(module)
    expect(result).toEqual({
      ...openApi
    })
  })

  test('$ref in original', async () => {
    const openApi = refSpec()
    const module: ModuleWithOpenApi = { ...testModule(), openApi }
    const result = await target.generate(module) as any
    expect(result.paths).toEqual(openApi.paths)
    expect(result.components.schemas).toEqual({
      Test: {
        type: 'object',
        properties: {
          TestP: { $ref: '#/components/schemas/ModuleSchema' },
          TestP2: { $ref: '#/components/schemas/ModuleSchema' },
          TestP3: { $ref: '#/components/schemas/Test' }
        }
      },
      ModuleSchema: {
        type: 'object',
        properties: { key: { type: 'number' } },
        'x-schema-type': 'Aggregate',
        'x-errors': [],
        'x-links': [],
        'x-todos': [],
        'x-tags': []
      }
    })
  })

  test('$ref in $ref', async () => {
    const openApi = refSpecInterface()
    const schema = testInterfaceSchema()
    const model = { ...testModel(), schemas: [testSchema(), schema] }
    const module: ModuleWithOpenApi = { ...model.modules[0], openApi }
    target = new OpenAPIGenerator(model, tmpDir.name)
    const result = await target.generate(module) as any
    expect((result.paths)['/pet'].put.responses[200].content['application/json'].schema.$ref).toEqual('#/components/schemas/ModuleInterface')
    expect(result.components.schemas).toEqual({
      ModuleInterface: {
        type: 'object',
        oneOf: [{ $ref: '#/components/schemas/ModuleSchema' }],
        properties: { field1: { type: 'string' } },
        'x-schema-type': 'Aggregate',
        'x-errors': [],
        'x-links': [],
        'x-todos': [],
        'x-tags': []
      },
      ModuleSchema: {
        type: 'object',
        properties: { key: { type: 'number' } },
        'x-schema-type': 'Aggregate',
        'x-errors': [],
        'x-links': [],
        'x-todos': [],
        'x-tags': []
      }
    })
  })
})
