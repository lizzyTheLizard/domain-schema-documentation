import { defaultWriter } from './DefaultWriter.ts'
import * as tmp from 'tmp'
import { type Writer } from './Writer.ts'
import { promises as fs } from 'fs'
import { type Schema, type Application, type Module } from '../reader/Reader.ts'

describe('defaultWriter', () => {
  let tmpDir: tmp.DirResult
  let target: Writer
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

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = defaultWriter(tmpDir.name, [])
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Write Application File', async () => {
    await target({ application, modules: [], schemas: [schema] })
    const files = await fs.readdir(tmpDir.name)
    expect(files).toContain('README.md')
    const content = (await fs.readFile(tmpDir.name + '/README.md', 'utf-8')).toString()
    expect(content).toContain('# Test Application')
    expect(content).toContain('Test Application Description')
    expect(content).not.toContain('## Modules')
    expect(content).not.toContain('### Todo')
    expect(content).not.toContain('## Links')
  })

  test('Write Application File With Module', async () => {
    await target({ application, modules: [module], schemas: [schema] })
    const content = (await fs.readFile(tmpDir.name + '/README.md', 'utf-8')).toString()
    expect(content).toContain('## Modules')
    expect(content).toContain('[Test Module](./test/README.md)')
  })

  test('Write Module File', async () => {
    await target({ application, modules: [module], schemas: [] })
    const files = await fs.readdir(tmpDir.name + '/test')
    expect(files).toContain('README.md')
    const content = (await fs.readFile(tmpDir.name + '/test/README.md', 'utf-8')).toString()
    expect(content).toContain('# Test Module')
    expect(content).toContain('Test Module Description')
    expect(content).not.toContain('## Schemas')
    expect(content).not.toContain('### Todo')
    expect(content).not.toContain('## Links')
  })

  test('Write Module File With Schema', async () => {
    await target({ application, modules: [module], schemas: [schema] })
    const content = (await fs.readFile(tmpDir.name + '/test/README.md', 'utf-8')).toString()
    expect(content).toContain('## Schemas')
    expect(content).toContain('[Test Schema](./Schema.yaml.md)')
  })

  test('Write Object Schema file', async () => {
    await target({ application, modules: [module], schemas: [schema] })
    const files = await fs.readdir(tmpDir.name + '/test')
    expect(files).toContain('Schema.yaml.md')
    const content = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(content).toContain('# Test Schema')
    expect(content).toContain('Test Schema Description')
    expect(content).toContain('## Properties')
    expect(content).toContain('| id |  | string')
    expect(content).not.toContain('## SubSchema')
    expect(content).not.toContain('## Enum-Values')
    expect(content).not.toContain('## One Of')
  })

  test('Write Enum Schema file', async () => {
    const schema2: Schema = {
      $id: '/test/Schema.yaml',
      title: 'Test Schema',
      description: 'Test Schema Description',
      'x-schema-type': 'Aggregate',
      type: 'string',
      enum: ['A', 'B'],
      'x-enum-description': { A: 'Description' },
      definitions: {}
    }
    await target({ application, modules: [module], schemas: [schema2] })
    const content = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(content).toContain('## Enum-Values')
    expect(content).toContain('| A | Description |')
    expect(content).not.toContain('## Properties')
    expect(content).not.toContain('## SubSchema')
    expect(content).not.toContain('## One Of')
  })

  test('Write Interface Schema file', async () => {
    const schema2: Schema = { $id: '/test/Schema2.yaml', title: 'Title', 'x-schema-type': 'Aggregate', type: 'object', oneOf: [{ $ref: './Schema.yaml' }], definitions: {} }
    await target({ application, modules: [module], schemas: [schema, schema2] })
    const content = (await fs.readFile(tmpDir.name + '/test/Schema2.yaml.md', 'utf-8')).toString()
    expect(content).toContain('## One Of')
    expect(content).toContain('1. [Test Schema](./Schema.yaml.md)')
    expect(content).not.toContain('## Enum-Values')
    expect(content).not.toContain('## Properties')
    expect(content).not.toContain('## SubSchema')
  })

  test('Write Object SubSchema file', async () => {
    const schema2: Schema = { ...schema, type: 'object', properties: { id: { $ref: '#/definitions/SubSchema' } }, required: [], definitions: { SubSchema: { type: 'object', description: 'Sub-Schema Description', properties: { key: { type: 'string' } }, required: [] } } }
    await target({ application, modules: [module], schemas: [schema2] })
    const content = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(content).toContain('| id |  | [SubSchema](#SubSchema) |')
    expect(content).toContain('## Subschemas')
    expect(content).toContain('### SubSchema')
    expect(content).toContain('#### Properties')
    expect(content).toContain('| key |  | string')
  })

  test('Write Enum SubSchema file', async () => {
    const schema2: Schema = { ...schema, type: 'object', properties: { id: { $ref: '#/definitions/SubSchema' } }, required: [], definitions: { SubSchema: { type: 'string', description: 'Sub-Schema Description', enum: ['A', 'B'], 'x-enum-description': { A: 'Description' } } } }
    await target({ application, modules: [module], schemas: [schema2] })
    const content = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(content).toContain('## Subschemas')
    expect(content).toContain('### SubSchema')
    expect(content).toContain('#### Enum-Values')
    expect(content).toContain('| A | Description |')
  })

  test('Write Interface SubSchema file', async () => {
    const schema2: Schema = { ...schema, $id: '/test/Schema2.yaml', type: 'object', properties: { id: { $ref: '#/definitions/SubSchema' } }, required: ['id'], definitions: { SubSchema: { type: 'object', oneOf: [{ $ref: './Schema.yaml' }] } } }
    await target({ application, modules: [module], schemas: [schema, schema2] })
    const content = (await fs.readFile(tmpDir.name + '/test/Schema2.yaml.md', 'utf-8')).toString()
    expect(content).toContain('## Subschemas')
    expect(content).toContain('### SubSchema')
    expect(content).toContain('#### One Of')
    expect(content).toContain('1. [Test Schema](./Schema.yaml.md)')
  })

  test('Write Link', async () => {
    const application2: Application = { ...application, 'x-links': [{ text: 'Test Link', href: 'https://example.com' }] }
    const module2: Module = { ...module, 'x-links': [{ text: 'Test Link', href: 'https://example.com' }] }
    const schema2: Schema = { ...schema, 'x-links': [{ text: 'Test Link', href: 'https://example.com' }] }
    await target({ application: application2, modules: [module2], schemas: [schema2] })
    const applicationContent = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(applicationContent).toContain('## Links')
    expect(applicationContent).toContain('1. [Test Link](https://example.com)')
    const moduleContent = (await fs.readFile(tmpDir.name + '/test/README.md', 'utf-8')).toString()
    expect(moduleContent).toContain('## Links')
    expect(moduleContent).toContain('1. [Test Link](https://example.com)')
    const schemaContent = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(schemaContent).toContain('## Links')
    expect(schemaContent).toContain('1. [Test Link](https://example.com)')
  })

  test('Write Todo', async () => {
    const application2: Application = { ...application, 'x-todos': ['todo'] }
    const module2: Module = { ...module, 'x-todos': ['todo'] }
    const schema2: Schema = { ...schema, 'x-todos': ['todo'] }
    await target({ application: application2, modules: [module2], schemas: [schema2] })
    const applicationContent = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(applicationContent).toContain('### Todo')
    expect(applicationContent).toContain('> 1. todo')
    const moduleContent = (await fs.readFile(tmpDir.name + '/test/README.md', 'utf-8')).toString()
    expect(moduleContent).toContain('### Todo')
    expect(moduleContent).toContain('> 1. todo')
    const schemaContent = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(schemaContent).toContain('### Todo')
    expect(schemaContent).toContain('> 1. todo')
  })

  test('Write Tags', async () => {
    const application2: Application = { ...application, 'x-tags': { key: 'value' } }
    const module2: Module = { ...module, 'x-tags': { key: 'value' } }
    const schema2: Schema = { ...schema, 'x-tags': { key: 'value' } }
    await target({ application: application2, modules: [module2], schemas: [schema2] })
    const applicationContent = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(applicationContent).toContain('| key | value |')
    const moduleContent = (await fs.readFile(tmpDir.name + '/test/README.md', 'utf-8')).toString()
    expect(moduleContent).toContain('| key | value |')
    const schemaContent = (await fs.readFile(tmpDir.name + '/test/Schema.yaml.md', 'utf-8')).toString()
    expect(schemaContent).toContain('| key | value |')
  })
})
