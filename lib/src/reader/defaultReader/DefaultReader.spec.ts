import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import path from 'path'
import { type Reader } from '../Reader'
import { defaultReader } from './DefaultReader'

const applicationFile = { title: 'Title', description: 'Description' }
const moduleFile = { $id: '/Module', title: 'Module', description: 'Description' }
const schemaFile = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: { key: { type: 'number' } } }

describe('DefaultReader', () => {
  let tmpDir: tmp.DirResult
  let target: Reader

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = defaultReader(tmpDir.name)
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Read application file', async () => {
    const filePath = path.join(tmpDir.name, 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify(applicationFile))

    const model = await target()

    // Application was read and normalized
    expect(model.application.title).toEqual(applicationFile.title)
    expect(model.application.errors).toEqual([])
    expect(model.modules).toEqual([])
    expect(model.schemas).toEqual([])
  })

  test('Invalid application file', async () => {
    const filePath = path.join(tmpDir.name, 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify({ wrong: 'field' }))

    await expect(target()).rejects.toThrow(new Error(`Invalid file ${filePath}. See logs for details`))
  })

  test('Read module file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify(moduleFile))

    const model = await target()

    // Module was read and normalized
    expect(model.modules.length).toEqual(1)
    expect(model.modules[0].title).toEqual(moduleFile.title)
    expect(model.modules[0].errors).toEqual([])
  })

  test('Invalid module file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify({ wrong: 'value' }))

    await expect(target()).rejects.toThrow(new Error(`Invalid file ${filePath}. See logs for details`))
  })

  test('Read schema file (yaml)', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'Schema.yaml')
    await fs.writeFile(filePath, JSON.stringify(schemaFile))

    const model = await target()

    // Module was read and normalized
    expect(model.schemas.length).toEqual(1)
    expect(model.schemas[0].title).toEqual(schemaFile.title)
    expect(model.schemas[0]['x-errors']).toEqual([])
  })

  test('Read schema file (yml)', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'Schema.yml')
    const schemaFile2 = { ...schemaFile, $id: '/Module/Schema.yml' }
    await fs.writeFile(filePath, JSON.stringify(schemaFile2))

    const model = await target()

    // Module was read and normalized
    expect(model.schemas.length).toEqual(1)
    expect(model.schemas[0].title).toEqual(schemaFile.title)
    expect(model.schemas[0]['x-errors']).toEqual([])
  })

  test('Invalid schema file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'Schema.yml')
    await fs.writeFile(filePath, JSON.stringify({ wrong: 'value' }))

    await expect(target()).rejects.toThrow(new Error(`Invalid file ${filePath}. See logs for details`))
  })
})
