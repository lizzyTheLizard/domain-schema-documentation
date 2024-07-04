import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import { type Schema, type Application, type Module } from '../../reader/Reader'
import { htmlWriter } from './HtmlWriter'

describe('htmlWriter', () => {
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
  test('Write Application File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = htmlWriter(tmpDir.name)

    await target({ application, modules: [], schemas: [] })

    const files = await fs.readdir(tmpDir.name)
    expect(files).toContain('index.html')
    const content = (await fs.readFile(tmpDir.name + '/index.html', 'utf-8')).toString()
    expect(content).toContain('<h1>Test Application</h1>')
  })

  test('Write Module File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = htmlWriter(tmpDir.name)

    await target({ application, modules: [module], schemas: [] })

    const files = await fs.readdir(tmpDir.name + '/test')
    expect(files).toContain('index.html')
    const content = (await fs.readFile(tmpDir.name + '/test/index.html', 'utf-8')).toString()
    expect(content).toContain('<h1>Test Module</h1>')
  })

  test('Write Schema file', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = htmlWriter(tmpDir.name)

    await target({ application, modules: [module], schemas: [schema] })

    const files = await fs.readdir(tmpDir.name + '/test')
    expect(files).toContain('Schema.yaml.html')
    const content = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.html', 'utf-8')).toString()
    expect(content).toContain('<h1>Test Schema</h1>')
  })
})
