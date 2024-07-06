import * as tmp from 'tmp'
import * as fs from 'fs'
import {
  enhanceApplication,
  enhanceModule, enhanceSchema,
  loadTemplate,
  writeOutput
} from './WriterHelpers'
import path from 'path'
import { type Application, type Model, type Module, type Schema } from '../reader/Reader'

describe('writerHelpers', () => {
  const application: Application = {
    title: 'Test Application',
    description: 'Test Application Description',
    todos: [],
    links: [],
    errors: [{ type: 'NOT_IN_DOMAIN_MODEL', text: 'test' }]
  }
  const module: Module = {
    $id: '/test',
    title: 'Test Module',
    description: 'Test Module Description',
    todos: [],
    links: [],
    errors: [{ type: 'NOT_IN_DOMAIN_MODEL', text: 'test' }]
  }
  const schema: Schema = {
    $id: '/test/Schema.yaml',
    title: 'Test Schema',
    description: 'Test Schema Description',
    'x-schema-type': 'Aggregate',
    type: 'object',
    properties: { id: { type: 'string' } },
    definitions: {},
    required: [],
    'x-errors': [{ type: 'NOT_IN_DOMAIN_MODEL', text: 'test' }],
    'x-todos': [],
    'x-links': []
  }
  test('loadTemplate', () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'valid.hbs')
    fs.writeFileSync(filename, '{{title}}')

    const validTemplate = loadTemplate(filename)

    expect(() => validTemplate({ title: 'test' })).not.toThrow()
  })

  test('loadTemplate invalidFile', () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'invalid.hbs')
    fs.writeFileSync(filename, '{{title}')

    const invalidTemplate = loadTemplate(filename)

    expect(() => invalidTemplate({ title: 'test' })).toThrow('Parse error on line 1')
  })

  test('loadTemplate nonExisting', () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'notExist.hbs')

    expect(() => loadTemplate(filename)).toThrow(new Error(`ENOENT: no such file or directory, open '${filename}'`))
  })

  test('writeOutput', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })

    await writeOutput('test-content', '/folder/test.txt', tmpDir.name)

    const written = await fs.promises.readFile(path.join(tmpDir.name, '/folder/test.txt'))
    expect(written.toString()).toEqual('test-content')
  })

  test('enhanceApplication', async () => {
    const model: Model = { application, modules: [module], schemas: [schema] }

    const result = enhanceApplication(model)

    expect(result).toEqual({
      ...application,
      classDiagram: 'classDiagram\nclass _test["Test Module"]\nclick _test href "./test/index.html" "Test Module"',
      modules: [module]
    })
  })

  test('enhanceModule', async () => {
    const model: Model = { application, modules: [module], schemas: [schema] }

    const result = enhanceModule(model, module)

    expect(result).toEqual({
      ...module,
      classDiagram: result.classDiagram,
      schemas: [schema]
    })
  })

  test('enhanceSchema', async () => {
    const model: Model = { application, modules: [module], schemas: [schema] }

    const result = enhanceSchema(model, schema)

    expect(result).toEqual({
      ...schema,
      classDiagram: result.classDiagram,
      module,
      hasDefinitions: false
    })
  })
})
