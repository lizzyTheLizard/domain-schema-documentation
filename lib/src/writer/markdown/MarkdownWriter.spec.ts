import { markdownWriter } from './MarkdownWriter'
import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import { type Schema, type Application, type Module } from '../../reader/Reader'

describe('markdownWriter', () => {
  const application: Application = {
    title: 'Test Application',
    description: 'Test Application Description',
    errors: [],
    todos: [],
    links: []
  }
  const module: Module = {
    $id: '/test',
    title: 'Test Module',
    description: 'Test Module Description',
    errors: [],
    todos: [],
    links: []
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
    'x-errors': [],
    'x-todos': [],
    'x-links': []
  }
  test('Write Application File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = markdownWriter(tmpDir.name)

    await target({ application, modules: [], schemas: [] })

    const files = await fs.readdir(tmpDir.name)
    expect(files).toContain('README.md')
    const content = (await fs.readFile(tmpDir.name + '/README.md', 'utf-8')).toString()
    expect(content).toContain('# Test Application')
  })

  test('Write Module File', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = markdownWriter(tmpDir.name)

    await target({ application, modules: [module], schemas: [] })

    const files = await fs.readdir(tmpDir.name + '/test')
    expect(files).toContain('README.md')
    const content = (await fs.readFile(tmpDir.name + '/test/README.md', 'utf-8')).toString()
    expect(content).toContain('# Test Module')
  })

  test('Write Schema file', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = markdownWriter(tmpDir.name)

    await target({ application, modules: [module], schemas: [schema] })

    const files = await fs.readdir(tmpDir.name + '/test')
    expect(files).toContain('Schema.yaml.md')
    const content = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(content).toContain('# Test Schema')
  })
})
