import { defaultReader } from './reader/DefaultReader'
import { htmlWriter } from './writer/html/HtmlWriter'
import { type RunOptions } from './RunOptions'

// TODO: Document Run and Options
export async function run (options?: RunOptions): Promise<void> {
  const reader = options?.reader ?? defaultReader('./input')
  const plugins = options?.plugins ?? []
  const writers = options?.writers ?? [htmlWriter('./out')]

  let model = await reader()

  // Update model with plugins, must be executed in sequence
  for (const plugin of plugins) {
    model = await plugin.updateModel?.(model) ?? model
  }

  // Validate model with plugins, can be executed in parallel
  const errorMap = await Promise.all(plugins.map(async p => await p.validate?.(model) ?? []))
  const errors = errorMap.flatMap(e => e)

  // Generate output with plugins, can be executed in parallel
  await Promise.all(plugins.map(async p => await p.generateOutput?.(model)))

  // Write output, can be executed in parallel
  await Promise.all(writers.map(async w => { await w(model, errors) }))
}
