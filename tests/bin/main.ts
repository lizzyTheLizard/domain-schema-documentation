import { compareOutput, handleError } from 'test-shared'
import * as path from 'path'

const output: string = path.join(__dirname, 'out')

compareOutput(output)
  .catch((error: unknown) => { handleError(error) })
