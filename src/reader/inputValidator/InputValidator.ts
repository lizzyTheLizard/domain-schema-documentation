import { type Application, type Module, type ObjectSchema, type Schema } from '../Reader.ts'
import Ajv, { type AnySchema, type Options } from 'ajv'
import path from 'path'
import * as fs from 'fs'
import * as yaml from 'yaml'

export interface InputValidatorOptions {
  ajvOptions?: Options
  noAdditionalPropertiesInExamples?: boolean
}

export class InputValidator {
  readonly #ajv: Ajv
  #application?: Application
  readonly #modules: Module[] = []
  readonly #schemas: Schema[] = []

  constructor (private readonly options?: InputValidatorOptions) {
    this.#ajv = new Ajv(options?.ajvOptions ?? { allErrors: true })
    this.#ajv.addKeyword('x-schema-type')
    this.#ajv.addKeyword('x-references')
    this.#ajv.addKeyword('x-enum-description')
    // Used for openapi
    this.#ajv.addKeyword('discriminator')
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Application.yaml'))
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Module.yaml'))
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Schema.yaml'))
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Property.yaml'))
  }

  private readYamlFile (filePath: string): AnySchema {
    return yaml.parse(fs.readFileSync(filePath).toString())
  }

  public validateApplicationFile (parsed: Application): void {
    if (!this.#ajv.validate('_Application.yaml', parsed)) {
      throw new Error(`Invalid application file: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
    this.#application = parsed
  }

  public validateModuleFile (parsed: Module): void {
    if (!this.#ajv.validate('_Module.yaml', parsed)) {
      throw new Error(`Invalid module ${parsed.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
    this.#modules.push(parsed)
  }

  public validateSchemaFile (parsed: Schema): void {
    if (!this.#ajv.validate('_Schema.yaml', parsed)) {
      throw new Error(`Invalid schema ${parsed.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
    this.validateEnumDocumentation(parsed)
    this.validateRequired(parsed)
    this.#schemas.push(parsed)
  }

  private validateEnumDocumentation (m: Schema): void {
    if (m.type !== 'string' || m.enum === undefined) {
      return
    }
    if (!m['x-enum-description']) {
      console.log(`Schema ${m.$id} is an enum and should have an 'x-enum-description'`)
      return
    }
    const enumValues = m.enum
    const documentedValues = Object.keys(m['x-enum-description'])
    documentedValues.filter(k => !enumValues.includes(k)).forEach(k => { throw new Error(`Schema ${m.$id} has an 'x-enum-description' for enum value '${k}' that does not exist`) })
    enumValues.filter(k => !documentedValues.includes(k)).forEach(k => { throw new Error(`Schema ${m.$id} has an 'x-enum-description' but is missing documentation for enum value '${k}'`) })
  }

  private validateRequired (m: Schema): void {
    m = m as ObjectSchema
    if (m.type !== 'object' || m.properties === undefined) {
      return
    }
    if (!m.required) return
    const properties = Object.keys(m.properties ?? {})
    m.required
      .filter(r => !properties.includes(r))
      .forEach(r => { throw new Error(`Schema ${m.$id} has a required property '${r}' that is not defined`) })
  }

  public finishValidation (): void {
    // Verify application
    if (this.#application === undefined) {
      throw new Error('No application file found')
    }
    // Verify references
    this.#modules.forEach(m => {
      this.verifyReferencesRecursive(this.#schemas, m.$id, 'Module ' + m.$id, m)
    })
    this.#schemas.forEach(m => {
      this.verifyReferencesRecursive(this.#schemas, path.dirname(m.$id), 'Schema ' + m.$id, m)
    })
    // Verify examples
    this.#schemas.forEach(m => {
      if ((this.options?.noAdditionalPropertiesInExamples ?? true) && (m.type === 'object')) {
        const m2 = structuredClone(m) as any
        m2.additionalProperties = false
        this.#ajv.addSchema(m2 as AnySchema, m.$id)
      } else {
        this.#ajv.addSchema(m, m.$id)
      }
    })
    this.#schemas.forEach(m => {
      this.verifyExamples(m)
    })
  }

  private verifyReferencesRecursive (allSchemas: Schema[], baseDir: string, name: string, m: unknown): void {
    if (Array.isArray(m)) {
      m.forEach(v => { this.verifyReferencesRecursive(allSchemas, baseDir, name, v) })
    }
    if (typeof m === 'object' && m !== null) {
      Object.entries(m).forEach(([key, value]) => {
        const references: string[] = []
        if (key === '$ref') {
          references.push(value as string)
        } else if (key === 'x-references') {
          if (Array.isArray(value)) {
            references.push(...(value as string[]))
          } else {
            references.push(value as string)
          }
        } else {
          this.verifyReferencesRecursive(allSchemas, baseDir, name, value)
        }
        references
          .filter((r: string) => !allSchemas.find(m => m.$id === path.join(baseDir, r)))
          .forEach((r: string) => { throw new Error(`Invalid Reference '${r}' in ${name}`) })
      })
    }
  }

  private verifyExamples (m: Schema): void {
    switch (m['x-schema-type']) {
      case 'Aggregate':
      case 'ReferenceData':
        if (!m.examples) console.log(`Schema ${m.$id} is an ${m['x-schema-type']} and should have at least one example.`)
        break
      case 'Entity':
      case 'ValueObject':
        if (m.examples) console.log(`Schema ${m.$id} is an ${m['x-schema-type']} and should not have an example.`)
    }
    if (!m.examples) {
      return
    }
    m.examples.forEach((e, i) => {
      if (!this.#ajv.validate(m.$id, e)) {
        throw new Error(`Invalid example [${i}] in Schema ${m.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
      }
    })
  }
}
