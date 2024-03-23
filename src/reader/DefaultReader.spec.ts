import * as tmp from 'tmp'
import { promises as fs } from 'fs'
import path from 'path'
import { type Application, type Module, type Schema, type Reader } from './Reader.ts'
import { defaultReader } from './DefaultReader.ts'
import { type InputNormalizer } from './InputNormalizer.ts'

const inputNormalizer = {
  addApplication: jest.fn(),
  addModule: jest.fn(),
  addSchema: jest.fn(),
  toModel: jest.fn()
} as unknown as InputNormalizer

const applicationFile: Application = { title: 'Title', description: 'Description' }
const moduleFile: Module = { $id: '/Module', title: 'Module', description: 'Description' }
const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: {}, required: [], definitions: {} }

describe('DefaultReader', () => {
  let tmpDir: tmp.DirResult
  let target: Reader

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = defaultReader(tmpDir.name, { inputNormalizer })
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Read application file', async () => {
    const filePath = path.join(tmpDir.name, 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify(applicationFile))

    await target()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(inputNormalizer.addApplication).toHaveBeenCalledWith(applicationFile, filePath)
  })

  test('Read module file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'index.yaml')
    await fs.writeFile(filePath, JSON.stringify(moduleFile))

    await target()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(inputNormalizer.addModule).toHaveBeenCalledWith(moduleFile, filePath, moduleFile.$id)
  })

  test('Read schema file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const filePath = path.join(tmpDir.name, 'Module', 'Schema.yaml')
    await fs.writeFile(filePath, JSON.stringify(schemaFile))

    await target()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(inputNormalizer.addSchema).toHaveBeenCalledWith(schemaFile, filePath, schemaFile.$id)
  })
})
