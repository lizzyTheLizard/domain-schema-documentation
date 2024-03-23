import { type Model } from '../reader/Reader.ts'
import { type Plugin, type VerificationError } from '../plugin/Plugin.ts'

export type Writer = (model: Model, verificationErrors: VerificationError[], plugins: Plugin[]) => Promise<void>
