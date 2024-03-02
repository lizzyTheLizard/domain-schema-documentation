import Ajv, { type AnySchema, type Format, type Options } from 'ajv'
import path from 'path'
import * as fs from 'fs'
import * as yaml from 'yaml'
import { type SchemaType } from '../input/Schema.ts'

export interface InputValidatorOptions {
  ajvOptions: Options
  noAdditionalPropertiesInExamples: boolean
  formats: Array<{ name: string, avjFormat: Format }>
}

export interface WithId {
  $id: string
}

export class InputValidator {
  readonly #ajv: Ajv
  readonly #modules: WithId[] = []
  readonly #schemas: WithId[] = []

  constructor (private readonly options: InputValidatorOptions) {
    this.#ajv = new Ajv(options.ajvOptions)
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Application.yaml'))
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Module.yaml'))
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Schema.yaml'))
    this.#ajv.addSchema(this.readYamlFile('src/reader/inputDefinition/_Keywords.yaml'))
    this.options.formats?.forEach(f => this.#ajv.addFormat(f.name, f.avjFormat))
    this.#ajv.addKeyword('x-schema-type')
    this.#ajv.addKeyword('x-references')
    this.#ajv.addKeyword('x-enum-description')
    this.#ajv.addKeyword('x-todos')
    this.#ajv.addKeyword('x-tags')
    this.#ajv.addKeyword('x-links')
    // Used for openapi
    this.#ajv.addKeyword('discriminator')
  }

  private readYamlFile (filePath: string): AnySchema {
    return yaml.parse(fs.readFileSync(filePath).toString())
  }

  public validateApplicationFile (parsed: unknown): void {
    if (!this.#ajv.validate('_Application.yaml', parsed)) {
      throw new Error(`Invalid application file: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
  }

  public validateModuleFile (parsed: WithId): void {
    if (!this.#ajv.validate('_Module.yaml', parsed)) {
      throw new Error(`Invalid module ${parsed.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
    this.#modules.push(parsed)
  }

  public validateSchemaFile (parsed: WithId): void {
    if (!this.#ajv.validate('_Schema.yaml', parsed)) {
      throw new Error(`Invalid schema ${parsed.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
    }
    this.validateEnumDocumentationRecursive(parsed, parsed)
    this.validateRequiredRecursive(parsed, parsed)
    this.#schemas.push(parsed)
  }

  private validateEnumDocumentationRecursive (parentSchema: WithId, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') {
      return
    }
    Object.entries(subSchema).forEach(([_, value]) => { this.validateEnumDocumentationRecursive(parentSchema, value) })

    if (!('enum' in subSchema)) {
      if (('x-enum-description' in subSchema)) {
        console.error(`Schema in ${parentSchema.$id} has an 'x-enum-description' but is not an enum`)
      }
      return
    }
    if (!('x-enum-description' in subSchema)) {
      console.error(`Schema in ${parentSchema.$id} is an enum and should have an 'x-enum-description'`)
      return
    }
    const enumValues = subSchema.enum as string[]
    const enumDescriptions = subSchema['x-enum-description'] as Record<string, string>
    const documentedValues = Object.keys(enumDescriptions)
    documentedValues.filter(k => !enumValues.includes(k)).forEach(k => { throw new Error(`Schema in ${parentSchema.$id} has an 'x-enum-description' for enum value '${k}' that does not exist`) })
    enumValues.filter(k => !documentedValues.includes(k)).forEach(k => { throw new Error(`Schema in ${parentSchema.$id} has an 'x-enum-description' but is missing documentation for enum value '${k}'`) })
  }

  private validateRequiredRecursive (parentSchema: WithId, subSchema: unknown): void {
    if (subSchema == null || typeof subSchema !== 'object') {
      return
    }
    Object.entries(subSchema).forEach(([_, value]) => { this.validateRequiredRecursive(parentSchema, value) })
    if (!('required' in subSchema)) {
      return
    }
    const required = subSchema.required as string[]
    const properties = 'properties' in subSchema ? Object.keys(subSchema.properties as Record<string, unknown>) : []
    required
      .filter(r => !properties.includes(r))
      .forEach(r => { throw new Error(`Schema in ${parentSchema.$id} has a required property '${r}' that is not defined`) })
  }

  public finishValidation (): void {
    // Verify references
    this.#modules.forEach(m => {
      this.verifyReferencesRecursive(this.#schemas, m.$id, 'Module ' + m.$id, m)
    })
    this.#schemas.forEach(m => {
      this.verifyReferencesRecursive(this.#schemas, path.dirname(m.$id), 'Schema ' + m.$id, m)
    })
    // Verify examples
    this.#schemas.forEach(m => {
      if ((this.options.noAdditionalPropertiesInExamples) && ('type' in m) && (m.type === 'object')) {
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

  private verifyReferencesRecursive (allSchemas: WithId[], baseDir: string, name: string, m: unknown): void {
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
          .filter(r => !r.startsWith('#'))
          .filter((r: string) => !allSchemas.find(m => m.$id === path.join(baseDir, r)))
          .forEach((r: string) => { throw new Error(`Invalid Reference '${r}' in ${name}`) })
      })
    }
  }

  private verifyExamples (m: WithId): void {
    const hasExamples = 'examples' in m
    const schemaType = 'x-schema-type' in m ? m['x-schema-type'] as SchemaType : 'Entity'
    if (!hasExamples && (schemaType === 'Aggregate' || schemaType === 'ReferenceData')) {
      console.error(`Schema ${m.$id} is an ${schemaType} and should have at least one example.`)
    }
    if (!hasExamples) {
      return
    }
    const examples = m.examples as unknown[]
    examples.forEach((e, i) => {
      if (!this.#ajv.validate(m.$id, e)) {
        throw new Error(`Invalid example [${i}] in Schema ${m.$id}: ${this.#ajv.errorsText(this.#ajv.errors)}`)
      }
    })
  }
}
