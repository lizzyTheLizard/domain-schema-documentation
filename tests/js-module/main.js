import { run, defaultReader } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const output = path.join(__dirname, 'out')
const input = path.join(__dirname, '..', 'shared', 'input')

fs.rm(output, { recursive: true, force: true })
  .then(() => run({ reader: defaultReader(input) }))
  .then(() => compareOutput(output))
  .catch(error => handleError(error))
