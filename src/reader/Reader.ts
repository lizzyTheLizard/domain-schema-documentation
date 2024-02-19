export class Input {
  constructor (public readonly application: Application, public readonly modules: Module[], public readonly schemas: Schema[]) {
  }

  public getSchemasForModule (module: Module): Schema[] {
    return this.schemas.filter(schema => schema.$id.startsWith(module.$id))
  }

  public getSchemasForModuleAndTyp (module: Module, typ: SchemaType): Schema[] {
    return this.getSchemasForModule(module).filter(schema => schema['x-schema-type'] === typ)
  }
}

export interface Application {
  title: string
  description: string
  todos?: string[]
  links?: Array<{ text: string, href: string }>
}

export interface Module {
  $id: string
  title: string
  description: string
  todos?: string[]
  operations?: unknown
  links?: Array<{ text: string, href: string }>
}

export type Schema = EnumSchema | ObjectSchema | InterfaceSchema

export interface EnumSchema {
  $id: string
  title: string
  description?: string
  'x-schema-type': SchemaType
  type: 'string'
  enum: string[]
  'x-enum-description'?: Record<string, string>
  examples?: unknown[]
}

export interface ObjectSchema {
  $id: string
  title: string
  description?: string
  'x-schema-type': SchemaType
  type: 'object'
  properties: Record<string, Property>
  required?: string[]
  examples?: unknown[]
}

export interface InterfaceSchema {
  $id: string
  title: string
  description?: string
  'x-schema-type': SchemaType
  type: 'object'
  oneOf: Array<{ $ref: string }>
  examples?: unknown[]
}

export type Property = ReferenceProperty | ArrayProperty | BasicProperty

export interface ReferenceProperty {
  title?: string
  description?: string
  type: 'object'
  $ref: string
}

export interface ArrayProperty {
  title?: string
  description?: string
  type: 'array'
  items: Property
}

export interface BasicProperty {
  title?: string
  description?: string
  type: 'string' | 'number' | 'integer' | 'boolean' | 'null'
  format?: string
  'x-references'?: string | string[]
}

export type SchemaType = 'Aggregate' | 'Entity' | 'ValueObject' | 'ReferenceData'

export type Reader = () => Promise<Input>
