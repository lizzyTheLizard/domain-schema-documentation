import { type Application, type Module, type Schema } from '../../reader/Reader'
import * as tmp from 'tmp'
import path from 'path'
import { promises as fs } from 'fs'
import { type JavaPluginOptions } from './JavaPlugin'
import { javaValidator } from './JavaValidator'

describe('JavaValidator', () => {
  const application: Application = { title: 'Application', description: 'Application description', errors: [], todos: [], links: [] }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description', errors: [], todos: [], links: [] }
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': []
  }

  test('No Src Dir Given', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const options = { srcDir: undefined } as any as JavaPluginOptions
    const model = { application, modules: [module], schemas: [schema] }
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema['x-errors']).toEqual([])
  })

  test('Implementation is missing', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const model = { application, modules: [module], schemas: [schema] }
    await javaValidator(model, options)
    expect(schema['x-errors']).toEqual([{ text: '\'module.Schema\' should exist but is missing in the implementation', type: 'MISSING_IN_IMPLEMENTATION' }])
    expect(module.errors).toEqual([])
    expect(application.errors).toEqual([])
  })

  test('Empty Schema', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema {}')
    const model = { application, modules: [module], schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema['x-errors']).toEqual([])
  })

  test('Correct Implementation', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private Schema test; }')
    const schema2 = { ...schema, properties: { test: { $ref: '#' } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema2['x-errors']).toEqual([])
  })

  test('Missing Property', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const schema2 = { ...schema, properties: { test: { $ref: '#' } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema2['x-errors']).toEqual([{ text: 'Property \'test\' is missing in class \'module.Schema\'', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Excess Property', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private Schema test; }')
    const model = { application, modules: [module], schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema['x-errors']).toEqual([{ text: 'Property \'test\' should not exist in class \'module.Schema\'', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('Wrong Property', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private String test; }')
    const schema2 = { ...schema, properties: { test: { $ref: '#' } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema2['x-errors']).toEqual([{ text: 'Property \'test\' has type \'String\' in class \'module.Schema\' but should have type \'module.Schema\'', type: 'WRONG' }])
  })

  test('Missing definition Implementation', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const schema2: Schema = { ...schema, definitions: { test: { type: 'object', required: [], properties: { p1: { $ref: '#' } } } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema2['x-errors']).toEqual([{ text: '\'module.SchemaTest\' should exist but is missing in the implementation', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Correct Definition Implementation', async () => {
    application.errors = []; module.errors = []; schema['x-errors'] = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const filename2 = path.join(tmpDir.name, 'module', 'SchemaTest.java')
    await fs.writeFile(filename2, 'package module; public class SchemaTest { private Schema p1; }')
    const schema2: Schema = { ...schema, definitions: { test: { type: 'object', required: [], properties: { p1: { $ref: '#' } } } } }
    const model = { application, modules: [module], schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(application.errors).toEqual([])
    expect(module.errors).toEqual([])
    expect(schema2['x-errors']).toEqual([])
  })
})
