import { type Module, type Schema } from './IReader.ts'
import { type Config } from '../config/Config.ts'
import moduleSchema from './moduleSchema.json'
import applicationSchema from './applicationSchema.json'
import { type BaseReader } from './BaseReader.ts'
import Ajv from 'ajv'

export class InputValidator {
  readonly #ajv: Ajv

  constructor (private readonly config: Config) {
    this.#ajv = new Ajv(config.ajvOps ?? { allErrors: true })
  }

  public validateModuleFile (parsed: Module, filePath: string): void {
    if (!this.#ajv.validate(moduleSchema, parsed)) {
      console.log(this.#ajv.errors)
      throw new Error(`Invalid module file ${filePath}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
  }

  public validateApplicationFile (parsed: any, filePath: string): void {
    if (!this.#ajv.validate(applicationSchema, parsed)) {
      console.log(this.#ajv.errors)
      throw new Error(`Invalid application file ${filePath}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
  }

  public validateSchemaFile (parsed: Schema, filePath: string): void {
    if (parsed.$id) {
      throw new Error(`Invalid schema file ${filePath}: $id is missing`)
    }
    try {
      this.#ajv.addSchema(parsed, parsed.$id)
    } catch (e) {
      console.log(e)
      throw new Error(`Could not add schema ${parsed.$id} to ajv`)
    }
  }

  public validate (reader: BaseReader): void {
    reader.getSchemas().forEach(m => {
      if (this.config.noAdditionalPropertiesByDefault && m.type === 'object' && m.additionalProperties === undefined) {
        m.additionalProperties = false
      }
      // TODO: Is compile needed?
      this.#ajv.compile(m)
      this.verifyReferencesRecursive(reader.getSchemas(), m.$id, m)
      this.verifyExamples(m)
    })
    // TODO: Validate references in module files as well
  }

  private verifyReferencesRecursive (allSchemas: Schema[], name: string, m: Schema): void {
    // Do Recursive check for all sub-schemas
    if (m.properties) {
      Object.values(m.properties).forEach(p => {
        this.verifyReferencesRecursive(allSchemas, name, p)
      })
    }
    if (m.items) {
      this.verifyReferencesRecursive(allSchemas, name, m.items)
    }
    if (m.anyOf) {
      m.anyOf.forEach(a => {
        this.verifyReferencesRecursive(allSchemas, name, a)
      })
    }
    if (m.allOf) {
      m.allOf.forEach(a => {
        this.verifyReferencesRecursive(allSchemas, name, a)
      })
    }
    if (m.oneOf) {
      m.oneOf.forEach(a => {
        this.verifyReferencesRecursive(allSchemas, name, a)
      })
    }

    // Collect the references of this schema and check them
    // TODO: Must we check also $ref?
    let references = m['x-references']
    if (references === undefined) {
      references = []
    }
    if (typeof references === 'string') {
      references = [references]
    }
    references
      .filter((r: string) => !allSchemas.find(m => m.$id === r))
      .forEach((r: string) => {
        throw new Error('Invalid Reference ' + r + ' in ' + name)
      })
  }

  private verifyExamples (m: Schema): void {
    switch (m['x-schema-typ']) {
      case 'Aggregate':
      case 'Metadata':
        if (!m.examples) {
          console.error(`Schema ${m.$id} is an ${m['x-schema-typ']} and should have at least one example`)
        }
        break
      case 'Entity':
      case 'ValueObject':
      case 'DTO':
      case 'Enum':
        if (m.examples) {
          console.error(`Schema ${m.$id} is an ${m['x-schema-typ']} and should not have an example. It will be ignored`)
        }
        break
    }
    if (!m.examples) {
      return
    }
    m.examples.forEach((e, i) => {
      if (!this.#ajv.validate(m, e)) {
        console.log(this.#ajv.errors)
        throw new Error(`Invalid example [${i}] in ${m.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
      }
    })
  }
}
