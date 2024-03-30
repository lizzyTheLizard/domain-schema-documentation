import { type Plugin } from './plugin/Plugin'
import { type Writer } from './writer/Writer'
import { type Reader } from './reader/Reader'

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
