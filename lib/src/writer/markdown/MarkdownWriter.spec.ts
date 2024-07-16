import { markdownWriter } from './MarkdownWriter'
import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import { testModel } from '../../testData'

describe('markdownWriter', () => {
  test('Write Application File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = markdownWriter(tmpDir.name)
    const model = { ...testModel(), modules: [], schemas: [] }

    await target(model)

    const files = await fs.readdir(tmpDir.name)
    expect(files).toContain('README.md')
    const content = (await fs.readFile(tmpDir.name + '/README.md', 'utf-8')).toString()
    expect(content).toContain('# Title')
  })

  test('Write Module File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = markdownWriter(tmpDir.name)
    const model = { ...testModel(), schemas: [] }

    await target(model)

    const files = await fs.readdir(tmpDir.name + '/Module')
    expect(files).toContain('README.md')
    const content = (await fs.readFile(tmpDir.name + '/Module/README.md', 'utf-8')).toString()
    expect(content).toContain('# Module')
  })

  test('Write Schema file', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = markdownWriter(tmpDir.name)
    const model = testModel()

    await target(model)

    const files = await fs.readdir(tmpDir.name + '/Module')
    expect(files).toContain('Schema.yaml.md')
    const content = (await fs.readFile(tmpDir.name + '/Module/Schema.yaml.md', 'utf-8')).toString()
    expect(content).toContain('# Schema')
  })
})
