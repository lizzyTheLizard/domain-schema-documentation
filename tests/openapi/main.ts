import { run, defaultReader, openApiPlugin } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, '..', 'shared', 'input')
const output: string = path.join(__dirname, 'out')
const expected: string = path.join(__dirname, 'expected')

fs.rm(output, { recursive: true, force: true })
  .then(async () => { await run({ reader: defaultReader(input), plugins: [openApiPlugin(output)] }) })
  .then(async () => { await compareOutput(output, expected) })
  .catch(error => { handleError(error) })
