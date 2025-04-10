import { run, defaultReader } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, 'model')
const output: string = path.join(__dirname, 'out')
const expected: string = path.join(__dirname, 'expected')

fs.rm(output, { recursive: true, force: true })
  .then(async () => { await run({ reader: defaultReader(input) }) })
  .then(async () => { await compareOutput(output, expected, '/README.md,/.gitkeep') })
  .catch((error: unknown) => { handleError(error) })
