/* eslint-disable @typescript-eslint/no-require-imports */
const semver = require('semver')
const { exec } = require('child_process')
const currentVersion = require('./package.json').version
let oldVersion

exec('npm view domain-schema-documentation version', (error, stdout, stderr) => {
  if (error) {
    console.log(`error: ${error.message}`)
    return
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`)
    return
  }
  oldVersion = stdout.trim()
  if (!semver.gt(currentVersion, oldVersion)) {
    console.error(`Published version ${oldVersion} is greater or equal than current version ${currentVersion} => Bump version before publishing`)
    process.exit(-1)
  }
})
