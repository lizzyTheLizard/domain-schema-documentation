import { type Model } from '../reader/Reader'

// TODO: Document

export type Writer = (model: Model) => Promise<void>
