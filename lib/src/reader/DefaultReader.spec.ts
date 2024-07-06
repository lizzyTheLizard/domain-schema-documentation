import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import path from 'path'
import { type Reader, type Application, type Module, type Schema } from './Reader'
import { defaultReader } from './DefaultReader'
import { type InputNormalizer } from './InputNormalizer'

const inputNormalizer = {
  addApplication: jest.fn(),
  addModule: jest.fn(),
  addSchema: jest.fn(),
  toModel: jest.fn()
}

const applicationFile: Application = { title: 'Title', description: 'Description' }
const moduleFile: Module = { $id: '/Module', title: 'Module', description: 'Description' }
const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: {}, required: [], definitions: {} }

describe('DefaultReader', () => {
  let tmpDir: tmp.DirResult
  let target: Reader

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = defaultReader(tmpDir.name, { inputNormalizer: inputNormalizer as unknown as InputNormalizer })
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Read application file', async () => {
    const filePath = path.join(tmpDir.name, 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify(applicationFile))

    await target()

    expect(inputNormalizer.addApplication).toHaveBeenCalledWith(applicationFile, filePath)
  })

  test('Read module file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify(moduleFile))

    await target()

    expect(inputNormalizer.addModule).toHaveBeenCalledWith(moduleFile, filePath, moduleFile.$id)
  })

  test('Read schema file (yaml)', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'Schema.yaml')
    await fs.writeFile(filePath, JSON.stringify(schemaFile))

    await target()

    expect(inputNormalizer.addSchema).toHaveBeenCalledWith(schemaFile, filePath, schemaFile.$id)
  })

  test('Read schema file (yml)', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'Schema.yml')
    const schemaFile2 = { ...schemaFile, $id: '/Module/Schema.yml' }
    await fs.writeFile(filePath, JSON.stringify(schemaFile2))

    await target()

    expect(inputNormalizer.addSchema).toHaveBeenCalledWith(schemaFile2, filePath, '/Module/Schema.yml')
  })
})
