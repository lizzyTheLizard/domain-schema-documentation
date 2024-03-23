import { run } from './Run.ts'
import { openApiPlugin } from './plugin/openapi/OpenApiPlugin.ts'
import { javaPlugin } from './plugin/java/JavaPlugin.ts'
import { htmlWriter } from './writer/html/HtmlWriter.ts'
import { markdownWriter } from './writer/markdown/MarkdownWriter.ts'
import { defaultReader } from './reader/DefaultReader.ts'

run({
  reader: defaultReader('./input'),
  plugins: [openApiPlugin('./out'), javaPlugin('./out')],
  writers: [htmlWriter('./out'), markdownWriter('./out')]
}).catch(console.error)
