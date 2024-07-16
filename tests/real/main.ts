import { run, defaultReader, defaultFormats, markdownWriter, javaPlugin, type RunOptions, defaultJavaBasicTypeMap, defaultJavaFormatMap, type Model } from 'domain-schema-documentation'
import { compareOutput, handleError } from 'test-shared'
import { promises as fs } from 'fs'
import * as path from 'path'

const input: string = path.join(__dirname, 'model')
const output: string = path.join(__dirname, 'out')
const expected: string = path.join(__dirname, 'expected')

const runOptions: RunOptions = {
  reader: defaultReader(input, {
    // It would be nicer to reqrite those as tags, but this would require a change in the model
    allowedKeywords: ['x-misng-uidprefix', 'x-misng-alias'],
    allowedFormats: [...defaultFormats, { name: 'uid', avjFormat: (p: string) => uidVerifier(p) }],
    discriminator: 'ALLOW'
  }),
  plugins: [createMisNgTags, javaPlugin(output, {
    mainPackageName: 'ch.kessler.misng',
    modelPackageName: 'model',
    basicTypeMap: { ...defaultJavaBasicTypeMap, ...defaultJavaFormatMap, uid: 'ch.kessler.shared.uid' }
  })],
  writers: [markdownWriter(output)]
}

fs.rm(output, { recursive: true, force: true })
  .then(async () => { await run(runOptions) })
  .then(async () => { await compareOutput(output, expected, '/README.md,/.gitkeep') })
  .catch(error => { handleError(error) })

function uidVerifier (uid: string): boolean {
  if (typeof uid !== 'string') return false
  const split = uid.split('-')
  const prefix = split[0]
  const suffix = split.splice(1).join('-')
  if (!prefix.match('[a-zA-Z]*')) return false
  if (!suffix.match('[a-zA-Z\\-0-9]+')) return false
  return true
}

async function createMisNgTags (model: Model): Promise<void> {
  model.schemas.forEach(s => {
    if ('x-misng-alias' in s && typeof s['x-misng-alias'] === 'string') {
      s['x-misng-alias'].split(',').forEach(alias => {
        s['x-tags'].push({ name: 'Alias', value: alias.trim(), color: 'aqua' })
      })
    }
    if ('x-misng-uidprefix' in s && typeof s['x-misng-uidprefix'] === 'string') {
      s['x-tags'].push({ name: 'UID Prefix', value: s['x-misng-uidprefix'], color: 'blue' })
    }
  })
}
