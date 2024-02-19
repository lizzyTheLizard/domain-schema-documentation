import { defaultReader, readYamlFile } from './reader/DefaultReader.ts'
import { InputValidator } from './reader/inputValidator/InputValidator.ts'
import { type Verifier } from './verifier/Verifier.ts'
import { type Writer } from './writer/Writer.ts'
import { javaWriter } from './writer/java/JavaWriter.ts'
import { markdownDocumentationWriter } from './writer/markdown/MarkdownDocumentationWriter.ts'
import { openApiWriter } from './writer/openapi/OpenApiWriter.ts'
import { run } from './Run.ts'

const inputFolder = './input'
const outputFolder = './out'

const inputValidator = new InputValidator()
const reader = defaultReader(inputFolder, inputValidator, readYamlFile)
const verifiers: Verifier[] = []
const writers: Writer[] = [javaWriter(outputFolder), markdownDocumentationWriter(outputFolder), openApiWriter(outputFolder)]
run(reader, verifiers, writers).then(() => { console.log('Done') }).catch(console.error)
