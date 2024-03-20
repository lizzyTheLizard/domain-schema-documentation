import { type Model } from '../reader/Reader.ts'

export type Writer = (model: Model) => Promise<void>
