const path = require('path')
const { run, openApiPlugin, javaPlugin, htmlWriter, markdownWriter, defaultReader } = require('domain-schema-documentation')
const inputDir = path.join(__dirname, '/input')
const outputDir = path.join(__dirname, '/out')

run({
  reader: defaultReader(inputDir),
  plugins: [openApiPlugin(outputDir), javaPlugin(outputDir)],
  writers: [htmlWriter(outputDir), markdownWriter(outputDir)]
}).catch(console.error)
