import { run, defaultReader, openApiPlugin } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, '..', 'shared', 'input')
const output: string = path.join(__dirname, 'out')
const expected: string = path.join(__dirname, 'expected')
const source: string = path.join(__dirname, 'src', 'Module.openapi.yaml')

fs.rm(output, { recursive: true, force: true })
  .then(async () => { await run({ reader: defaultReader(input), plugins: [openApiPlugin(output, { srcSpec: m => m.$id === '/Module' ? source : undefined })] }) })
  .then(async () => { await compareOutput(output, expected) })
  .catch((error: unknown) => { handleError(error) })
