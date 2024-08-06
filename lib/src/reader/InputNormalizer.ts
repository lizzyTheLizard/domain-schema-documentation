import { type NormalizedSchema } from '../schemaNormalizer/NormalizedSchema'
import { SchemaNormalizer } from '../schemaNormalizer/SchemaNormalizer'
import { type SchemaNormalizerOptions } from '../schemaNormalizer/SchemaNormalizerOptions'
import { type Model, type Application, type Module, type Schema, type PropertyExtension } from './Reader'
import { InputValidator, type InputValidatorOptions } from './InputValidator'

/**
 * Normalizes the input, for a definition according to the inputDefinition to a {@link Model}
 */
export class InputNormalizer {
  readonly #applications: Application[] = []
  readonly #schemas: Schema[] = []

  readonly #modules: Module[] = []
  readonly #validator: InputValidator
  readonly #schemaNormalizer: SchemaNormalizer

  public constructor(
    options: InputValidatorOptions & SchemaNormalizerOptions) {
    this.#validator = new InputValidator(options)
    this.#schemaNormalizer = new SchemaNormalizer(options)
  }

  /**
   * Adds an read application object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   */
  public addApplication(parsed: unknown, fileLocation: string): void {
    const nonNormalizedApplication = this.#validator.validateApplicationFile(parsed, fileLocation)
    const application: Application = {
      ...nonNormalizedApplication,
      errors: nonNormalizedApplication.errors ?? [],
      todos: nonNormalizedApplication.todos ?? [],
      links: nonNormalizedApplication.links ?? [],
      tags: nonNormalizedApplication.tags ?? [],
    }
    this.#applications.push(application)
  }

  /**
   * Adds an read module object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   * @param expectedId An expected ID that should be in this object (e.g. from filename) or none, if no ID is expected
   */
  public addModule(parsed: unknown, fileLocation: string, expectedId?: string): void {
    const nonNormalizedModule = this.#validator.validateModuleFile(parsed, fileLocation, expectedId)
    const module: Module = {
      ...nonNormalizedModule,
      errors: nonNormalizedModule.errors ?? [],
      todos: nonNormalizedModule.todos ?? [],
      links: nonNormalizedModule.links ?? [],
      tags: nonNormalizedModule.tags ?? [],
    }
    this.#modules.push(module)
  }

  /**
   * Adds an read schema object
   * @param parsed The read object
   * @param fileLocation The location of the file, for debug infos only
   * @param expectedId The expected ID that should be in this object (e.g. from filename) or none, if no ID is expected
   */
  public addSchema(parsed: unknown, fileLocation: string, expectedId?: string): void {
    const nonNormalizedSchema = this.#validator.validateSchemaFile(parsed, fileLocation, expectedId)
    const normalizedSchema = this.#schemaNormalizer.normalize(nonNormalizedSchema)
    const errors = this.#schemaNormalizer.getErrors()
    if (errors.length > 0) {
      console.error(errors)
      throw new Error(`Failed to normalize schema ${nonNormalizedSchema.$id}. See logs for details`)
    }
    const schema: Schema = {
      ...normalizedSchema as NormalizedSchema<unknown, PropertyExtension>,
      'x-schema-type': (normalizedSchema as Partial<Schema>)['x-schema-type'] ?? 'Other',
      'x-links': (normalizedSchema as Partial<Schema>)['x-links'] ?? [],
      'x-tags': (normalizedSchema as Partial<Schema>)['x-tags'] ?? [],
      'x-errors': (normalizedSchema as Partial<Schema>)['x-errors'] ?? [],
      'x-todos': (normalizedSchema as Partial<Schema>)['x-todos'] ?? [],
    }

    this.#validator.addSchemaToAjv(schema)
    this.#schemas.push(schema)
  }

  /**
   * Convert the read in object to a normalized model
   * @returns The normalized model
   */
  public toModel(): Model {
    if (this.#applications.length === 0) throw new Error('No application file found')
    this.#schemas.forEach((s) => {
      this.#validator.validateReferences(s, s)
    })
    this.#schemas.forEach((m) => {
      this.#validator.validateExamples(m)
    })
    return { application: this.#applications[0], modules: this.#modules, schemas: this.#schemas }
  }
}
