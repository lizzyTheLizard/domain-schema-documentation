import { type Application, type Module, type Schema } from '../../reader/Reader'
import * as tmp from 'tmp'
import path from 'path'
import { promises as fs } from 'fs'
import { type JavaPluginOptions } from './JavaPlugin'
import { javaValidator } from './JavaValidator'

describe('JavaValidator', () => {
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

  test('No Src Dir Given', async () => {
    const options = { srcDir: undefined } as any as JavaPluginOptions
    const model = { application, modules: [module], schemas: [schema] }
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([])
  })

  test('Implementation is missing', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const model = { application, modules: [module], schemas: [schema] }
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([
      { schema, text: `File '${tmpDir.name}/module/Schema.java' should exist but is missing in the implementation`, type: 'MISSING_IN_IMPLEMENTATION' },
      { module, text: 'Schema \'Schema 1\' has 1 validation errors', type: 'WRONG' },
      { application, text: 'Module \'Module\' has 1 validation errors', type: 'WRONG' }
    ])
  })

  test('Empty Schema', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema {}')
    const model = { application, modules: [module], schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([])
  })

  test('Correct Implementation', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private Schema test; }')
    const schema2 = { ...schema, properties: { test: { $ref: '#' } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([])
  })

  test('Missing Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const schema2 = { ...schema, properties: { test: { $ref: '#' } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([
      { schema: schema2, text: `Property 'test' is missing in file '${filename}'`, type: 'MISSING_IN_IMPLEMENTATION' },
      { module, text: 'Schema \'Schema 1\' has 1 validation errors', type: 'WRONG' },
      { application, text: 'Module \'Module\' has 1 validation errors', type: 'WRONG' }
    ])
  })

  test('Excess Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private Schema test; }')
    const model = { application, modules: [module], schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([
      { schema, text: `Property 'test' should not exist in file '${filename}'`, type: 'NOT_IN_DOMAIN_MODEL' },
      { module, text: 'Schema \'Schema 1\' has 1 validation errors', type: 'WRONG' },
      { application, text: 'Module \'Module\' has 1 validation errors', type: 'WRONG' }
    ])
  })

  test('Wrong Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private String test; }')
    const schema2 = { ...schema, properties: { test: { $ref: '#' } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([
      { schema: schema2, text: `Property 'test' has type 'String' in file '${filename}' but should have type 'module.Schema'`, type: 'WRONG' },
      { module, text: 'Schema \'Schema 1\' has 1 validation errors', type: 'WRONG' },
      { application, text: 'Module \'Module\' has 1 validation errors', type: 'WRONG' }
    ])
  })

  test('Missing definition Implementation', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const schema2: Schema = { ...schema, definitions: { test: { type: 'object', required: [], properties: { p1: { $ref: '#' } } } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([
      { schema: schema2, text: `File '${tmpDir.name}/module/SchemaTest.java' should exist but is missing in the implementation`, type: 'MISSING_IN_IMPLEMENTATION' },
      { module, text: 'Schema \'Schema 1\' has 1 validation errors', type: 'WRONG' },
      { application, text: 'Module \'Module\' has 1 validation errors', type: 'WRONG' }
    ])
  })

  test('Correct Definition Implementation', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const filename2 = path.join(tmpDir.name, 'module', 'SchemaTest.java')
    await fs.writeFile(filename2, 'package module; public class SchemaTest { private Schema p1; }')
    const schema2: Schema = { ...schema, definitions: { test: { type: 'object', required: [], properties: { p1: { $ref: '#' } } } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const target = javaValidator(options)
    const result = await target(model)
    expect(result).toEqual([])
  })
})
