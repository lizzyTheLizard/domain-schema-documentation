import { type Plugin } from './plugin/Plugin'
import { type Writer } from './writer/Writer'
import { type Model, type ImplementationError, type Reader, type Module, type Tag } from './reader/Reader'
import { defaultReader } from './reader/DefaultReader'
import { htmlWriter } from './writer/html/HtmlWriter'
import { getSchemasForModule } from './reader/InputHelper'

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
export async function run(optionsOrUndefined?: Partial<RunOptions>): Promise<void> {
  const options = applyDefaults(optionsOrUndefined)

  // Read the input model
  const model = await options.reader()

  // Update model with plugins, must be executed in sequence as they update the model
  for (const plugin of options.plugins) {
    await plugin(model)
  }

  // Finalize the model
  finalize(model)

  // Write output, can be executed in parallel
  await Promise.all(options.writers.map(async (w) => { await w(model) }))
}

function applyDefaults(options?: Partial<RunOptions>): RunOptions {
  return {
    reader: options?.reader ?? defaultReader('./input'),
    plugins: options?.plugins ?? [],
    writers: options?.writers ?? [htmlWriter('./out')],
  }
}

function finalize(model: Model): void {
  model.schemas.forEach(s => s['x-tags'].push(...getErrorTags(s['x-errors'])))
  model.modules.forEach(m => m.errors.push(...getSchemaErrors(model, m)))
  model.modules.forEach(m => m.tags.push(...getErrorTags(m.errors)))
  model.application.errors.push(...getModuleErrors(model))
  model.application.tags.push(...getErrorTags(model.application.errors))
}

function getModuleErrors(model: Model): ImplementationError[] {
  return model.modules.flatMap((m) => {
    const count = m.errors.length
    if (count === 0) return []
    if (count === 1) {
      return [{ text: `Module '${m.title}' has 1 validation error`, type: 'WRONG' }]
    }
    return [{ text: `Module '${m.title}' has ${count} validation errors`, type: 'WRONG' }]
  })
}

function getSchemaErrors(model: Model, module: Module): ImplementationError[] {
  return getSchemasForModule(model, module).flatMap((s) => {
    const count = s['x-errors'].length
    if (count === 0) return []
    if (count === 1) {
      return [{ text: `Schema '${s.title}' has 1 validation error`, type: 'WRONG' }]
    }
    return [{ text: `Schema '${s.title}' has ${count} validation errors`, type: 'WRONG' }]
  })
}

function getErrorTags(error: ImplementationError[]): Tag[] {
  if (error.length === 0) return []
  return [{ name: 'Validator Errors', value: error.length.toString(), color: 'red' }]
}
