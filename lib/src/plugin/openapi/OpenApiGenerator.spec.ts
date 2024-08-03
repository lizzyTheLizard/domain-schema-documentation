import { OpenApiGenerator } from './OpenApiGenerator'
import { testInterfaceSchema, testModel, testModule, testSchema } from '../../testData'
import { fullSpec, refSpec, refSpecInterface } from './testData'

describe('OpenAPIGenerator', () => {
  const module = testModule()
  let target: OpenApiGenerator

  beforeEach(() => {
    target = new OpenApiGenerator(testModel())
  })

  test('reject invalid', async () => {
    await expect(target.generate(module, { ...fullSpec(), wrong: 'value' })).rejects.toThrow()
    await expect(target.generate(module, fullSpec())).resolves.not.toThrow()
  })

  test('fill default values', async () => {
    const result = await target.generate(module, {})
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
    const result = await target.generate(module, openApi)
    expect(result).toEqual(openApi)
  })

  test('$ref in original', async () => {
    const openApi = refSpec()
    const result = await target.generate(module, openApi)
    expect(result.paths).toEqual((openApi as any).paths)
    expect(result.components?.schemas).toEqual({
      Test: {
        type: 'object',
        properties: {
          TestP: { $ref: '#/components/schemas/ModuleSchema' },
          TestP2: { $ref: '#/components/schemas/ModuleSchema' },
          TestP3: { $ref: '#/components/schemas/Test' }
        }
      },
      ModuleSchema: {
        title: 'Schema',
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
    const result = await target.generate(model.modules[0], openApi) as any
    expect(result.paths['/pet'].put.responses[200].content['application/json'].schema.$ref).toEqual('#/components/schemas/ModuleInterface')
    expect(result.components.schemas).toEqual({
      ModuleInterface: {
        title: 'Interface',
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
        title: 'Schema',
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
