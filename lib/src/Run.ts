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
   * Reader to use. Must implement the {@link Reader} interface.
   * If not defined, {@link defaultReader} is used on folder './input'
   */
  reader: Reader
  /**
   * Plugins to use. Must implement the {@link Plugin} interface.
   * If not defined, no plugins are used.
   */
  plugins: Plugin[]
  /**
   * Writers to use. Must implement the {@link Writer} interface.
   * If not defined, {@link htmlWriter} is used on folder './out'
   */
  writers: Writer[]
}

/**
 * Run domain-schema-documentation with the given options.
 * @param optionsOrUndefined Options or default if not given
 * @returns Promise that resolves when the run is finished
 */
export async function run (optionsOrUndefined?: Partial<RunOptions>): Promise<void> {
  const options = applyDefaults(optionsOrUndefined)

  // Read the input model
  const model = await options.reader()

  // Update model with plugins, must be executed in sequence as they update the model
  for (const plugin of options.plugins) {
    await plugin(model)
  }

  // Write output, can be executed in parallel
  await Promise.all(options.writers.map(async w => { await w(model) }))
}

function applyDefaults (options?: Partial<RunOptions>): RunOptions {
  return {
    reader: options?.reader ?? defaultReader('./input'),
    plugins: options?.plugins ?? [],
    writers: options?.writers ?? [htmlWriter('./out')]
  }
}
