import { type Input } from '../reader/Reader.ts'
import { type VerificationError } from '../verifier/Verifier.ts'

export type Writer = (input: Input, errors: VerificationError[]) => Promise<void>
