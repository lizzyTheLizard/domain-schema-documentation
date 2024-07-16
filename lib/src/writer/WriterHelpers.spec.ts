import * as tmp from 'tmp'
import * as fs from 'fs'
import {
  enhanceApplication,
  enhanceModule, enhanceSchema,
  loadTemplate,
  writeOutput
} from './WriterHelpers'
import path from 'path'
import { type Model } from '../reader/Reader'
import { testModel } from '../testData'

describe('writerHelpers', () => {
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
    const model: Model = testModel()

    const result = enhanceApplication(model)

    expect(result).toEqual({
      ...model.application,
      classDiagram: result.classDiagram,
      modules: [model.modules[0]]
    })
  })

  test('enhanceModule', async () => {
    const model: Model = testModel()

    const result = enhanceModule(model, model.modules[0])

    expect(result).toEqual({
      ...model.modules[0],
      classDiagram: result.classDiagram,
      schemas: [model.schemas[0]]
    })
  })

  test('enhanceSchema', async () => {
    const model: Model = testModel()

    const result = enhanceSchema(model, model.schemas[0])

    expect(result).toEqual({
      ...model.schemas[0],
      classDiagram: result.classDiagram,
      module: model.modules[0],
      hasDefinitions: false
    })
  })
})
