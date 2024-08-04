import { type Model } from '../reader/Reader'
import { cleanName } from '../reader/InputHelper'
import { writeOutput } from './WriterHelpers'
import { htmlWriter } from './html/HtmlWriter'
import { markdownWriter } from './markdown/MarkdownWriter'

/**
 * A writer takes the model and produces some output. It is not allowed to alter the model in any way.
 * Examples for writers are {@link htmlWriter} or {@link markdownWriter}
 * but you can define your own writers as well.
 */
export type Writer = (model: Model) => Promise<void>

export interface WriterBaseOptions {
  /** Write output to a single output file relativeFilename in the output dir */
  write: (output: string, relativeFilename: string) => Promise<void>
  /** Get a readable name from a JSON-Schema format or type. Default is {@link typeName}, implementing a mapping for all base types and ajvFormats, using {@link cleanName} for the rest */
  typeName: (formatOrType: string) => string
}

/**
 * Apply defaults for base options
 * @param outputFolder The folder to write to
 * @param optionsOrUndefined The options given
 * @returns The options incl. defaults for values not defined
 */
export function applyWriterOptionsDefaults(outputFolder: string, optionsOrUndefined?: Partial<WriterBaseOptions>): WriterBaseOptions {
  return {
    write: optionsOrUndefined?.write ?? (async (o, f) => { await writeOutput(o, f, outputFolder) }),
    typeName: (formatOrType: string) => typeName(formatOrType),
  }
}

/**
 * Gets a human readable name for all base types and formats
 * @param formatOrType The input base type or format
 * @returns The human readable form
 */
export function typeName(formatOrType: string): string {
  switch (formatOrType.toLowerCase()) {
    case 'ipv4':
    case 'ipv6':
    case 'uuid':
      return formatOrType.toUpperCase()
    case 'number':
      return 'Double'
    case 'int32':
      return 'Integer'
    case 'int64':
      return 'Long'
    default:
      return formatOrType.split('-').map(n => cleanName(n)).join()
  }
}
