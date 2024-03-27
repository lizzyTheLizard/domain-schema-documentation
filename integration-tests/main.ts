import {
  defaultReader,
  htmlWriter,
  javaPlugin,
  markdownWriter,
  openApiPlugin,
  run
} from 'domain-schema-documentation'
import * as path from "path";

const inputDir = path.join(__dirname, '/input');
const outputDir = path.join(__dirname, '/out');

run({
  cleanOutput: outputDir,
  reader: defaultReader(inputDir),
  plugins: [openApiPlugin(outputDir), javaPlugin(outputDir)],
  writers: [htmlWriter(outputDir), markdownWriter(outputDir)]
}).catch(console.error)
