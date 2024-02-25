import * as tmp from 'tmp'
import { type InputValidator } from './inputValidator/InputValidator.ts'
import { promises as fs } from 'fs'
import path from 'path'
import { type Application, type Module } from './input/Input.ts'
import { defaultReader, readYamlFile } from './DefaultReader.ts'
import { type Reader } from './Reader.ts'
import { getSchemasForModuleAndTyp } from './input/InputHelper.ts'
import { type Schema } from './input/Schema.ts'

const inputValidator = {
  validateModuleFile: jest.fn(),
  validateApplicationFile: jest.fn(),
  validateSchemaFile: jest.fn(),
  finishValidation: jest.fn()
} as unknown as InputValidator

const applicationFile: Application = { title: 'Title', description: 'Description' }
const moduleFile: Module = { $id: '/Module', title: 'Module', description: 'Description' }
const schemaFile: Schema = { $id: '/Module/Schema.yaml', title: 'Schema', 'x-schema-type': 'Aggregate', type: 'object', properties: {} }

describe('DefaultReader', () => {
  let tmpDir: tmp.DirResult
  let target: Reader

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = defaultReader(tmpDir.name, [], [], inputValidator, readYamlFile)
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Read application file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))

    const input = await target()

    expect(input.schemas).toEqual([])
    expect(input.modules).toEqual([])
    expect(input.application).toEqual(applicationFile)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(inputValidator.validateApplicationFile).toHaveBeenCalledWith(applicationFile)
  })

  test('missing application file', async () => {
    await expect(target()).rejects.toThrow('No application file found')
  })

  test('Fail on invalid top level file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.writeFile(path.join(tmpDir.name, 'otherFile.txt'), 'Garbage')

    await expect(target()).rejects.toThrow('Unexpected file')
  })

  test('Fail on invalid lower level file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(path.join(tmpDir.name, 'module', 'otherFile.txt'), 'Garbage')

    await expect(target()).rejects.toThrow('Unexpected file')
  })

  test('Read module file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'index.yaml'), JSON.stringify(moduleFile))

    const input = await target()

    expect(input.schemas).toEqual([])
    expect(input.modules).toEqual([moduleFile])
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(inputValidator.validateModuleFile).toHaveBeenCalledWith(moduleFile)
  })

  test('module file with invalid Id', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'index.yaml'), JSON.stringify({ ...moduleFile, $id: 'Module2' }))

    await expect(async () => await target()).rejects.toThrow()
  })

  test('module file with missing Id', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const moduleFile2: any = { ...moduleFile }
    delete moduleFile2.$id
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'index.yaml'), JSON.stringify(moduleFile2))

    await expect(async () => await target()).rejects.toThrow()
  })

  test('Read schema file', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'Schema.yaml'), JSON.stringify(schemaFile))

    const input = await target()

    expect(input.schemas).toEqual([schemaFile])
    expect(input.modules).toEqual([])
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(inputValidator.validateSchemaFile).toHaveBeenCalledWith(schemaFile)
  })

  test('Get schema by module and typ', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'index.yaml'), JSON.stringify(moduleFile))
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'Schema.yaml'), JSON.stringify(schemaFile))

    const input = await target()

    expect(getSchemasForModuleAndTyp(input, moduleFile, 'Aggregate')).toEqual([schemaFile])
    expect(getSchemasForModuleAndTyp(input, { ...moduleFile, $id: 'Other' }, 'Aggregate')).toEqual([])
    expect(getSchemasForModuleAndTyp(input, moduleFile, 'Entity')).toEqual([])
  })

  test('schema file with invalid Id', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'Schema.yaml'), JSON.stringify({ ...schemaFile, $id: 'Module2/Schema2.yaml' }))

    await expect(async () => await target()).rejects.toThrow()
  })

  test('schema file with missing Id', async () => {
    await fs.writeFile(path.join(tmpDir.name, 'index.yaml'), JSON.stringify(applicationFile))
    await fs.mkdir(path.join(tmpDir.name, 'Module'))
    const schemaFile2: any = { ...schemaFile }
    delete schemaFile2.$id
    await fs.writeFile(path.join(tmpDir.name, 'Module', 'Schema.yaml'), JSON.stringify(schemaFile2))

    await expect(async () => await target()).rejects.toThrow()
  })
})
