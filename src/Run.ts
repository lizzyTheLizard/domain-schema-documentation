import { type VerificationError, type Verifier } from './verifier/Verifier.ts'
import { type Writer } from './writer/Writer.ts'
import { type Input, type Reader } from './reader/Reader.ts'

export async function run (reader: Reader, verifiers: Verifier[], writers: Writer[]): Promise<void> {
  const input = await reader()
  const verifier = mergedVerifier(verifiers)
  const errors = await verifier(input)
  const writer = mergedWriter(writers)
  await writer(input, errors)
}

function mergedWriter (writers: Writer[]): Writer {
  return async function (input: Input, errors: VerificationError[]): Promise<void> {
    await Promise.all(writers.map(async w => { await w(input, errors) }))
  }
}

function mergedVerifier (verifiers: Verifier[]): Verifier {
  return async function (input: Input): Promise<VerificationError[]> {
    const errors: VerificationError[] = []
    for (const verifier of verifiers) {
      errors.push(...await verifier(input))
    }
    return errors
  }
}
