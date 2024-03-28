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

// TODO: Separate example and integration tests
// TODO: Better integration test with all the features
// TODO: Move GitHub-Pages template to here

run({
  cleanOutput: outputDir,
  reader: defaultReader(inputDir),
  plugins: [openApiPlugin(outputDir), javaPlugin(outputDir)],
  writers: [htmlWriter(outputDir), markdownWriter(outputDir)]
}).catch(console.error)
