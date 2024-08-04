import { run, defaultReader, openApiPlugin, markdownWriter, javaPlugin, htmlWriter } from 'domain-schema-documentation'
import * as path from 'path'
const inputDir = path.join(__dirname, '/input')
const outputDir = path.join(__dirname, '/out')

run({
  reader: defaultReader(inputDir),
  plugins: [openApiPlugin(outputDir), javaPlugin(outputDir)],
  writers: [htmlWriter(outputDir), markdownWriter(outputDir)],
}).catch((e: unknown) => { console.error(e) })
