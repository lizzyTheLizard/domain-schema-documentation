import { run, defaultReader, javaPlugin, markdownWriter } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, 'input')
const output: string = path.join(__dirname, 'out')
const expected: string = path.join(__dirname, 'expected')
const src: string = path.join(__dirname, 'src')

fs.rm(output, { recursive: true, force: true })
  .then(async () => {
    await run({
      reader: defaultReader(input),
      writers: [markdownWriter(output)],
      plugins: [javaPlugin(output, { srcDir: src, ignoreAdditionalFiles: false })]
    })
  })
  .then(async () => { await compareOutput(output, expected) })
  .catch(error => { handleError(error) })
