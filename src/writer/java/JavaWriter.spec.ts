import * as tmp from 'tmp'
import { type Application, Input, type Module, type Schema } from '../../reader/Reader.ts'
import { javaWriter } from './JavaWriter.ts'
import { type Writer } from '../Writer.ts'
import path from 'path'
import { promises as fs } from 'fs'

const applicationDef: Application = { title: 'Title', description: 'Description' }
const moduleDef: Module = { $id: 'Module', title: 'Module', description: 'Description' }

describe('JavaWriter', () => {
  let tmpDir: tmp.DirResult
  let target: Writer

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true })
    target = javaWriter(tmpDir.name)
  })

  test('enum without documentation', async () => {
    const schemaDef: Schema = { $id: 'Module/Enum.yaml', title: 'Enum', 'x-schema-type': 'ValueObject', type: 'string', enum: ['A', 'B'] }
    const input = new Input(applicationDef, [moduleDef], [schemaDef])
    await target(input, [])
    const targetFileName = path.join(tmpDir.name, 'Module', 'java', 'Enum.java')
    const content = await fs.readFile(targetFileName, 'utf8')
    expect(content).toBe('public enum Enum {\n  A,\n  B,\n}\n')
  })
})
