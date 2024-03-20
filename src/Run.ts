import { type Plugin } from './plugin/Plugin.ts'
import { defaultReader } from './reader/DefaultReader.ts'
import { htmlWriter } from './writer/html/HtmlWriter.ts'

export async function run (
  plugins: Plugin[],
  reader = defaultReader('./input', plugins),
  writer = htmlWriter('./out', plugins)
): Promise<void> {
  const input = await reader()
  await writer(input)
}
