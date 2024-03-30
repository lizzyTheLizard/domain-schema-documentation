import * as tmp from 'tmp'
import * as fs from 'fs'
import {
  enhanceApplication,
  enhanceModule, enhanceSchema,
  loadTemplate,
  writeOutput
} from './WriterHelpers'
import path from 'path'
import { type Application, type Model, type Module, type Schema } from '../reader/Model'
import { type VerificationError } from './Writer'

describe('writerHelpers', () => {
  const application: Application = {
    title: 'Test Application',
    description: 'Test Application Description'
  }
  const module: Module = {
    $id: '/test',
    title: 'Test Module',
    description: 'Test Module Description'
  }
  const schema: Schema = {
    $id: '/test/Schema.yaml',
    title: 'Test Schema',
    description: 'Test Schema Description',
    'x-schema-type': 'Aggregate',
    type: 'object',
    properties: { id: { type: 'string' } },
    definitions: {},
    required: []
  }
  const applicationError: VerificationError = { type: 'NOT_IN_DOMAIN_MODEL', text: 'test', application }
  const moduleError: VerificationError = { type: 'NOT_IN_DOMAIN_MODEL', text: 'test', module }
  const schemaError: VerificationError = { type: 'NOT_IN_DOMAIN_MODEL', text: 'test', schema }
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

    const result = enhanceApplication(model, [applicationError, schemaError, moduleError])

    expect(result).toEqual({
      ...application,
      classDiagram: 'classDiagram\nclass _test["Test Module"]\nclick _test href "./test/index.html" "Test Module"',
      links: [],
      todos: ['1 validation error'],
      modules: [module],
      errors: [applicationError]
    })
  })

  test('enhanceModule', async () => {
    const model: Model = { application, modules: [module], schemas: [schema] }

    const result = enhanceModule(model, module, [applicationError, schemaError, moduleError])

    expect(result).toEqual({
      ...module,
      classDiagram: result.classDiagram,
      links: [],
      todos: ['1 validation error'],
      schemas: [schema],
      errors: [moduleError]
    })
  })

  test('enhanceSchema', async () => {
    const model: Model = { application, modules: [module], schemas: [schema] }

    const result = enhanceSchema(model, schema, [applicationError, schemaError, moduleError])

    expect(result).toEqual({
      ...schema,
      classDiagram: result.classDiagram,
      'x-links': [],
      'x-todos': ['1 validation error'],
      errors: [schemaError],
      module,
      hasDefinitions: false
    })
  })
})
