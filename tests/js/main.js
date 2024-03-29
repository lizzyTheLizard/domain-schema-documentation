const { run, defaultReader } = require('domain-schema-documentation')
const { compareOutput, handleError } = require('test-shared')
const { promises: fs } = require('fs')
const path = require('path')

const output = path.join(__dirname, 'out')
const input = path.join(__dirname, '..', 'shared', 'input')

fs.rm(output, { recursive: true, force: true })
  .then(() => run({ reader: defaultReader(input) }))
  .then(() => compareOutput(output))
  .catch(error => handleError(error))
