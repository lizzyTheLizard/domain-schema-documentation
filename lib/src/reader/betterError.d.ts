/* eslint-disable */
// This workaround is needed because the type definition for better-ajv-errors is not correct in package.json
// See https://github.com/atlassian/better-ajv-errors/issues/176 for details
// If fixed, this file can be removed
// It is a 1:1-copy of the type definition in the better-ajv-errors, just the declare module is added
declare module 'better-ajv-errors' {

  import type { ErrorObject } from 'ajv'

  export interface IOutputError {
    start: { line: number, column: number, offset: number }
    // Optional for required
    end?: { line: number, column: number, offset: number }
    error: string
    suggestion?: string
  }

  export interface IInputOptions {
    format?: 'cli' | 'js'
    indent?: number | null

    /** Raw JSON used when highlighting error location */
    json?: string | null
  }

  export default function <S, T, Options extends IInputOptions>(
    schema: S,
    data: T,
    errors: ErrorObject[],
    options?: Options
  ): Options extends { format: 'js' } ? IOutputError[] : string
}
