import { type Application, type Module, type Schema, type Model } from '../Reader'
import { type InputNormalizer } from './InputNormalizer'
import { InputValidator, type InputValidatorOptions } from './InputValidator'
import { normalizeSchema } from './SchemaNormalizer'

/**
 * Options for the InputNormalizer
 */
export interface DefaultInputNormalizerOptions extends InputValidatorOptions {}

/**
 * Generate a new default input normalizer
 * @param options The options for the input normalizer
 * @returns The input normalizer
 */
export function defaultInputNormalizer (options: DefaultInputNormalizerOptions): InputNormalizer {
  return new DefaultInputNormalizer(options)
}

class DefaultInputNormalizer implements InputNormalizer {
  readonly #applications: Application[] = []
  readonly #schemas: Schema[] = []
  readonly #modules: Module[] = []
  readonly #validator: InputValidator

  public constructor (options: DefaultInputNormalizerOptions) {
    this.#validator = new InputValidator(options)
  }

  public addApplication (parsed: unknown, fileLocation: string): void {
    const nonNormalizedApplication = this.#validator.validateApplicationFile(parsed, fileLocation)
    const application: Application = {
      ...nonNormalizedApplication,
      errors: nonNormalizedApplication.errors ?? [],
      todos: nonNormalizedApplication.todos ?? [],
      links: nonNormalizedApplication.links ?? []
    }
    this.#applications.push(application)
  }

  public addModule (parsed: unknown, fileLocation: string, expectedId?: string): void {
    const nonNormalizedModule = this.#validator.validateModuleFile(parsed, fileLocation, expectedId)
    const module: Module = {
      ...nonNormalizedModule,
      errors: nonNormalizedModule.errors ?? [],
      todos: nonNormalizedModule.todos ?? [],
      links: nonNormalizedModule.links ?? []
    }
    this.#modules.push(module)
  }

  public addSchema (parsed: unknown, fileLocation: string, expectedId?: string): void {
    const noNormalizedSchema = this.#validator.validateSchemaFile(parsed, fileLocation, expectedId)
    const schema = normalizeSchema(noNormalizedSchema)
    this.#validator.addSchemaToAjv(schema)
    this.#schemas.push(schema)
  }

  public toModel (): Model {
    if (this.#applications.length === 0) throw new Error('No application file found')
    this.#modules.forEach(m => {
      this.#validator.validateReferences(m, m)
    })
    this.#schemas.forEach(m => {
      this.#validator.validateReferences(m, m)
    })
    this.#schemas.forEach(m => {
      this.#validator.validateExamples(m)
    })
    return { application: this.#applications[0], modules: this.#modules, schemas: this.#schemas }
  }
}
