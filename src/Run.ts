import { type Plugin } from './plugin/Plugin.ts'
import { defaultReader } from './reader/DefaultReader.ts'
import { defaultWriter } from './writer/DefaultWriter.ts'

export async function run (
  plugins: Plugin[],
  reader = defaultReader('./input', plugins),
  writer = defaultWriter('./out', plugins)
): Promise<void> {
  const input = await reader()
  await writer(input)
}
