import { type Plugin } from './plugin/Plugin'
import { type Writer } from './writer/Writer'
import { type Reader } from './reader/Reader'
import { defaultReader } from './reader/DefaultReader'
import { htmlWriter } from './writer/html/HtmlWriter'

/**
 * Options for the run function.
 */
export interface RunOptions {
  /**
   * Reader to use. Must implement the Reader interface.
   * If not defined, defaultReader is used on folder './input'
   * @see reader/Reader
   * @see reader/DefaultReader
   */
  reader: Reader
  /**
   * Plugins to use. Must implement the Plugin interface.
   * If not defined, no plugins are used.
   * @see plugin/Plugin
   */
  plugins: Plugin[]
  /**
   * Writers to use. Must implement the Writer interface.
   * If not defined, htmlWriter is used on folder './out'
   * @see writer/Writer
   * @see writer/html/HtmlWriter
   */
  writers: Writer[]
}

/**
 * Run domain-schema-documentation with the given options.
 * @param optionsOrUndefined Options or default if not given
 * @returns {Promise<void>} Promise that resolves when the run is finished
 * @see RunOptions
 */
export async function run (optionsOrUndefined?: Partial<RunOptions>): Promise<void> {
  const options = applyDefaults(optionsOrUndefined)

  // Read the input model
  let model = await options.reader()

  // Update model with plugins, must be executed in sequence
  for (const plugin of options.plugins) {
    model = await plugin.updateModel?.(model) ?? model
  }

  // Validate model with plugins, can be executed in parallel
  const errorMap = await Promise.all(options.plugins.map(async p => await p.validate?.(model) ?? []))
  const errors = errorMap.flatMap(e => e)

  // Generate output with plugins, can be executed in parallel
  await Promise.all(options.plugins.map(async p => await p.generateOutput?.(model)))

  // Write output, can be executed in parallel
  await Promise.all(options.writers.map(async w => { await w(model, errors) }))
}

function applyDefaults (options?: Partial<RunOptions>): RunOptions {
  return {
    reader: options?.reader ?? defaultReader('./input'),
    plugins: options?.plugins ?? [],
    writers: options?.writers ?? [htmlWriter('./out')]
  }
}
