import { run, defaultReader } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, '..', 'shared', 'input')
const output: string = path.join(__dirname, 'out')

fs.rm(output, { recursive: true, force: true })
  .then(async () => { await run({ reader: defaultReader(input) }) })
  .then(async () => { await compareOutput(output) })
  .catch(error => { handleError(error) })
