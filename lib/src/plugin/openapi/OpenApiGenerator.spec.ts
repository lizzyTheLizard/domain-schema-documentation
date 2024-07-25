import { OpenApiGenerator } from './OpenApiGenerator'
import { testInterfaceSchema, testModel, testModule, testSchema } from '../../testData'
import { fullSpec, refSpec, refSpecInterface } from './testData'

describe('OpenAPIGenerator', () => {
  const module = testModule()
  let target: OpenApiGenerator

  beforeEach(() => {
    target = new OpenApiGenerator(testModel())
  })

  test('fill default values', () => {
    const result = target.generate(module, {})
    expect(result).toEqual({
      openapi: '3.0.3',
      info: { title: module.title, description: module.description, version: new Date().toDateString() },
      servers: [],
      paths: {},
      components: { schemas: {}, securitySchemes: {} }
    })
  })

  test('overwrite defaults if given', () => {
    const openApi = fullSpec()
    const result = target.generate(module, openApi)
    expect(result).toEqual(openApi)
  })

  test('$ref in original', () => {
    const openApi = refSpec()
    const result = target.generate(module, openApi) as any
    expect(result.paths).toEqual((openApi as any).paths)
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
    target = new OpenApiGenerator(model)
    const result = target.generate(model.modules[0], openApi) as any
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
