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

  test('No openApi and no spec', async () => {
    const module = testModule()
    await validate(module, undefined, options)
    expect(module.errors).toEqual([])
  })

  test('Additional spec file', async () => {
    await fs.writeFile(options.srcSpec, 'openapi: 3.1.0')
    const module = testModule()
    await validate(module, undefined, options)
    expect(module.errors).toEqual([{
      text: `'${options.srcSpec}' should not exist but is present in the implementation`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }])
  })

  test('Missing spec file', async () => {
    const module = { ...testModule() }
    await validate(module, fullSpec(), options)
    expect(module.errors).toEqual([{
      text: `'${options.srcSpec}' should exist but is missing in the implementation`,
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
      text: `Path '/new' should not exist in '${options.srcSpec}' but is present`,
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
      text: `Path '/new' should exist in '${options.srcSpec}' but is missing`,
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
      text: `Method 'PUT /new' should not exist in '${options.srcSpec}' but is present`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }, {
      text: `Method 'GET /new' should exist in '${options.srcSpec}' but is missing`,
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
      text: `Response '201' on method 'GET /new' should not exist in '${options.srcSpec}' but is present`,
      type: 'NOT_IN_DOMAIN_MODEL'
    }, {
      text: `Response '200' on method 'GET /new' should exist in '${options.srcSpec}' but is missing`,
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
      text: `Response '200' on method 'GET /new' differs in schema. Should be '${JSON.stringify(expectedSpec.components.schemas.C2)}' but is '${JSON.stringify(actualSpec.components.schemas.C1)}'`,
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
      text: `Response '200' on method 'GET /new' differs in schema. Should be '${JSON.stringify(expectedSpec.components.schemas.C2)}' but is '${JSON.stringify(actualSpec.components.schemas.C1)}'`,
      type: 'WRONG'
    }])
  })
})
