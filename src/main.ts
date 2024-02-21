import { javaWriter } from './plugin/java/JavaWriter.ts'
import { openApiWriter } from './plugin/openapi/OpenApiWriter.ts'
import { run } from './Run.ts'

run([javaWriter, openApiWriter]).then(() => { console.log('Done') }).catch(console.error)
