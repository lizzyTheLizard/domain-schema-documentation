import { type Link } from './Input.ts'

export type Schema = SchemaCommon & (EnumDefinition | ObjectDefinition | InterfaceDefinition)
export type Definition = DefinitionCommon & (EnumDefinition | ObjectDefinition | InterfaceDefinition)
export type SchemaType = 'Aggregate' | 'Entity' | 'ValueObject' | 'ReferenceData' | 'Other'
export type Property = ArrayProperty | ObjectProperty | BasicProperty

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
  oneOf?: Property[]
}

export interface ArrayProperty {
  type: 'array'
  items: Property
}

export interface ObjectProperty {
  type: 'object'
  $ref?: string
}

export interface BasicProperty {
  type: 'boolean' | 'integer' | 'null' | 'number' | 'string'
  'x-references'?: string | string[]
  format?: string
}
