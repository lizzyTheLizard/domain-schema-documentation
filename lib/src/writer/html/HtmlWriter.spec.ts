import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import { htmlWriter } from './HtmlWriter'
import { testModel } from '../../testData'

describe('htmlWriter', () => {
  test('Write Application File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = htmlWriter(tmpDir.name)
    const model = { ...testModel(), modules: [], schemas: [] }

    await target(model)

    const files = await fs.readdir(tmpDir.name)
    expect(files).toContain('index.html')
    const content = (await fs.readFile(tmpDir.name + '/index.html', 'utf-8')).toString()
    expect(content).toContain('<h1>Title</h1>')
  })

  test('Write Module File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = htmlWriter(tmpDir.name)
    const model = { ...testModel(), schemas: [] }

    await target(model)

    const files = await fs.readdir(tmpDir.name + '/Module')
    expect(files).toContain('index.html')
    const content = (await fs.readFile(tmpDir.name + '/Module/index.html', 'utf-8')).toString()
    expect(content).toContain('<h1>Module</h1>')
  })

  test('Write Schema file', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = htmlWriter(tmpDir.name)
    const model = testModel()

    await target(model)

    const files = await fs.readdir(tmpDir.name + '/Module')
    expect(files).toContain('Schema.yaml.html')
    const content = (await fs.readFile(tmpDir.name + '/Module/Schema.yaml.html', 'utf-8')).toString()
    expect(content).toContain('<h1>Schema</h1>')
  })
})
