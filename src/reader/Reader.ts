export type Reader = () => Promise<Model>

export interface Model {
  application: Application
  modules: Module[]
  schemas: Schema[]
}

export interface Application {
  title: string
  description: string
  'x-tags'?: Record<string, string>
  'x-todos'?: string[]
  'x-links'?: Link[]
}

export interface Module {
  $id: string
  title: string
  description: string
  operations?: unknown
  'x-tags'?: Record<string, string>
  'x-todos'?: string[]
  'x-links'?: Link[]
}

export interface Link {
  text: string
  href: string
}

export type Schema = SchemaCommon & (EnumDefinition | ObjectDefinition | InterfaceDefinition)
export type Definition = DefinitionCommon & (EnumDefinition | ObjectDefinition | InterfaceDefinition)
export type SchemaType = 'Aggregate' | 'Entity' | 'ValueObject' | 'ReferenceData' | 'Other'
export type Property = ArrayProperty | RefProperty | BasicProperty

export interface SchemaCommon {
  $id: string
  title: string
  description?: string
  examples?: unknown[]
  definitions: Record<string, Definition>
  type: 'object' | 'string'
  'x-schema-type': SchemaType
  'x-tags'?: Record<string, string>
  'x-todos'?: string[]
  'x-links'?: Link[]
}

export interface DefinitionCommon {
  description?: string
  type: 'object' | 'string'
}

export interface EnumDefinition {
  type: 'string'
  enum: string[]
  'x-enum-description'?: Record<string, string>
}

export interface ObjectDefinition {
  type: 'object'
  properties: Record<string, Property>
  required: string[]
}

export interface InterfaceDefinition {
  type: 'object'
  oneOf: RefProperty[]
}

export interface ArrayProperty {
  type: 'array'
  items: Property
}

export interface RefProperty {
  $ref: string
}

export interface BasicProperty {
  type: 'boolean' | 'integer' | 'null' | 'number' | 'string'
  'x-references'?: string | string[]
  format?: string
}
