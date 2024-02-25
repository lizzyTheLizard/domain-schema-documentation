import { type Input } from './input/Input.ts'

export type Reader = () => Promise<Input>
