import { run, defaultReader, markdownWriter, htmlWriter, javaPlugin } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, 'input')
const output: string = path.join(__dirname, 'out')
const expected: string = path.join(__dirname, 'expected')
const src: string = path.join(__dirname, '..', 'java', 'src')

fs.rm(output, { recursive: true, force: true })
  .then(async () => {
    await run({
      reader: defaultReader(input),
      writers: [markdownWriter(output), htmlWriter(output)],
      plugins: [javaPlugin(output, { srcDir: src, ignoreAdditionalFiles: false })],
    })
  })
  .then(async () => { await compareOutput(output, expected) })
  .catch((error: unknown) => { handleError(error) })
