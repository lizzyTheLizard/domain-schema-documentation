import { type Plugin } from './plugin/Plugin'
import { type Writer } from './writer/Writer'
import { type Reader } from './reader/Reader'

// TODO: Document Run and Options
export interface RunOptions {
  plugins?: Plugin[]
  reader?: Reader
  writers?: Writer[]
}
