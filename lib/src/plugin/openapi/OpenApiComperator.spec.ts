import * as tmp from 'tmp'
import { OpenApiComperator } from './OpenApiComperator'
import { testModule } from '../../testData'
import { fullSpec } from './testData'
import path from 'path'
import { promises as fs } from 'fs'
import * as yaml from 'yaml'

describe('OpenApiComperator', () => {
  let tmpDir: tmp.DirResult
  let options: { srcSpec: string }
  let target: OpenApiComperator

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    options = { srcSpec: path.join(tmpDir.name, 'Module.openapi.yaml') }
    target = new OpenApiComperator(options)
  })

  test('No spec', async () => {
    const module = testModule()
    await target.ensureNoSpec(module)
    expect(module.errors).toEqual([])
  })

  test('Additional spec file', async () => {
    await fs.writeFile(options.srcSpec, 'openapi: 3.1.0')
    const module = testModule()
    await target.ensureNoSpec(module)
    expect(module.errors).toEqual([{
      text: `'${options.srcSpec}' should not exist as module has no openapi specification`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }])
  })

  test('Missing spec file', async () => {
    const actualSpec = fullSpec()
    const module = testModule()
    await target.ensureEqual(module, actualSpec)
    expect(module.errors).toEqual([{
      text: `'${options.srcSpec}' should exist as module has an openapi specification`,
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
    const module = testModule()
    await target.ensureEqual(module, actualSpec)
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([])
  })

  test('X-Properties', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'string' } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'string', 'x-header': 'Value' } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([])
  })

  // TODO: Fix test if enum-values are supported
  /*  test('Enum-values', async () => {
    const actualSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'string', enum: ['A'] } } }
    }
    const expectedSpec = {
      openapi: '3.0.3',
      info: { title: 'test', description: 'test2', version: '1' },
      paths: { '/new': { get: { responses: { 200: { description: 'Successful operation', content: { 'application/json': { schema: { $ref: '#/components/schemas/C1' } } } } } } } },
      components: { schemas: { C1: { type: 'string', enum: ['A', 'B'], 'x-enum-description': { A: 'Test' } } } }
    }
    await fs.writeFile(options.srcSpec, yaml.stringify(actualSpec))
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual(['a'])
  })
*/
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([{
      text: `Type must be 'number' but is 'string' in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([{
      text: `Property 'key2' must exist in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }, {
      text: `Property 'key' must not exist in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([{
      text: `Property 'key2' must exist in request body on method 'PUT /new' in '${options.srcSpec}'`,
      type: 'MISSING_IN_IMPLEMENTATION'
    }, {
      text: `Property 'key' must not exist in request body on method 'PUT /new' in '${options.srcSpec}'`,
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([{
      text: `Property 'key.key2' must exist in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
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
    const module = testModule()
    await target.ensureEqual(module, expectedSpec)
    expect(module.errors).toEqual([{
      text: `Type of 'key.key' must be 'number' but is 'string' in response body '200' on method 'GET /new' in '${options.srcSpec}'`,
      type: 'WRONG'
    }])
  })
})
