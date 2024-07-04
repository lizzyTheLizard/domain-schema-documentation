import { type Model } from '../reader/Reader'
import { htmlWriter } from './html/HtmlWriter'
import { markdownWriter } from './markdown/MarkdownWriter'

/**
 * A writer takes the model and produces some output. It is not allowed to alter the model in any way.
 * Examples for writers are {@link htmlWriter} or {@link markdownWriter}
 * but you can define your own writers as well.
 */
export type Writer = (model: Model) => Promise<void>
