import * as tmp from 'tmp'
import { validate } from './OpenApiValiator'
import { testModule } from '../../testData'
import { fullSpec } from './testData'
import path from 'path'
import { promises as fs } from 'fs'
import * as yaml from 'yaml'

describe('OpenAPIValidator', () => {
  let tmpDir: tmp.DirResult
  let options: { srcSpec: string }

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    options = { srcSpec: path.join(tmpDir.name, 'Module.openapi.yaml') }
  })

  test('No spec', async () => {
    const module = testModule()
    await validate(module, undefined, options)
    expect(module.errors).toEqual([])
  })

  test('Additional spec file', async () => {
    await fs.writeFile(options.srcSpec, 'openapi: 3.1.0')
    const module = testModule()
    await validate(module, undefined, options)
    expect(module.errors).toEqual([{
      text: `'${options.srcSpec}' should not exist as ${module.$id} has no openapi specification`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }])
  })

  test('Missing spec file', async () => {
    const module = { ...testModule() }
    await validate(module, fullSpec(), options)
    expect(module.errors).toEqual([{
      text: `'${options.srcSpec}' should exist as ${module.$id} has an openapi specification`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }])
  })

  test('Identical file', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, actualSpec, options)
    expect(module.errors).toEqual([])
  })

  test('Additional Path', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `Path '/new' must not exist in '${options.srcSpec}'`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }])
  })

  test('Missing Path', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `Path '/new' must exist in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }])
  })

  test('Different Method', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { put: { responses: { 200: { description: 'Successful operation' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `Method 'PUT /new' must not exist in '${options.srcSpec}'`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }, {
      text: `Method 'GET /new' must exist in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }])
  })

  test('Wrong Response Code', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 201: { description: 'Successful operation' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `Response '201' on method 'GET /new' must not exist in '${options.srcSpec}'`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }, {
      text: `Response '200' on method 'GET /new' must exist in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }])
  })

  test('Different schema name', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'string' } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C2' } } } } } } } },
      components: { schemas: { C2: { type: 'string' } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([])
  })

  test('Wrong response type', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'string' } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C2' } } } } } } } },
      components: { schemas: { C2: { type: 'number' } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `/type is 'string' instead of 'number' in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'WRONG'
    }])
  })

  test('Wrong response property', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key: { type: 'string' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C2' } } } } } } } },
      components: { schemas: { C2: { type: 'object', properties: { key2: { type: 'string' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `/properties/key2 is missing in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }, {
      text: `/properties/key should not exist in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }])
  })

  test('Wrong request property', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { put: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } }, responses: { 201: { description: 'Successful operation' } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key: { type: 'string' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { put: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } }, responses: { 201: { description: 'Successful operation' } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key2: { type: 'string' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `/properties/key2 is missing in request body on method 'PUT /new' in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }, {
      text: `/properties/key should not exist in request body on method 'PUT /new' in '${options.srcSpec}'`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }])
  })

  test('Wrong response property (deep)', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key: { $ref: '#/components/schemas/C2' } } }, C2: { type: 'object', properties: { key: { type: 'string' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key: { $ref: '#/components/schemas/C2' } } }, C2: { type: 'object', properties: { key: { type: 'string' }, key2: { type: 'number' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `/properties/key/properties/key2 is missing in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }])
  })

  test('Wrong property type (deep)', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key: { $ref: '#/components/schemas/C2' } } }, C2: { type: 'object', properties: { key: { type: 'string' } } } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'object', properties: { key: { $ref: '#/components/schemas/C2' } } }, C2: { type: 'object', properties: { key: { type: 'number' } } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = { ...testModule() }
    await validate(module, expectedSpec, options)
    expect(module.errors).toEqual([{
      text: `/properties/key/properties/key/type is 'string' instead of 'number' in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'WRONG'
    }])
  })
})
