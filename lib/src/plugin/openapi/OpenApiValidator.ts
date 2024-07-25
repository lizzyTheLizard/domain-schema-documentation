import { type SchemaObject } from 'ajv'
import Ajv from 'ajv-draft-04'
import addFormats from 'ajv-formats'
import * as yaml from 'yaml'
import path from 'path'
import fs from 'fs'
import betterAjvErrors from 'better-ajv-errors'

export class OpenApiValidator {
  readonly #ajv: Ajv
  readonly #openApiSchema: SchemaObject

  constructor () {
    this.#ajv = new Ajv({ allErrors: true, strict: false })
    addFormats(this.#ajv)
    this.#ajv.addFormat('media-range', true)
    const schemaFile = path.join(__dirname, 'openapi_30.yaml')
    this.#openApiSchema = yaml.parse(fs.readFileSync(schemaFile).toString())
  }

  public validate (src: string, spec: object): void {
    if (!('openapi' in spec) || typeof spec.openapi !== 'string') {
      throw new Error('OpenAPI-Spec must have an openapi field with the openapi version')
    }
    if (!spec.openapi.startsWith('3.0')) {
      throw new Error('Only OpenAPI 3.0.X is supported')
    }
    try {
      if (this.#ajv.validate(this.#openApiSchema, spec)) return
    } catch (e: unknown) {
      const error = e as Error
      throw new Error(`Invalid OpenAPI-Spec in ${src}: ${error.message}`)
    }
    const errors = this.#ajv.errors
    if (!errors) {
      throw new Error(`Invalid OpenAPI-Spec in ${src}: ${this.#ajv.errorsText()}`)
    }
    const json = JSON.stringify(spec, null, ' ')
    console.error(betterAjvErrors(this.#openApiSchema, spec, errors, { json }))
    throw new Error(`Invalid OpenAPI-Spec in ${src}. See logs for details`)
  }
}
