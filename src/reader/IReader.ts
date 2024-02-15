export interface IReader {
  read: () => Promise<void>
  getApplication: () => Application
  getModules: () => Module[]
  getSchemas: () => Schema[]
  getSchemasForModule: (module: Module) => Schema[]
  getSchemasForModuleAndTyp: (module: Module, typ: SchemaTyp) => Schema[]
}

export interface Application {
  $id: string
}

export type SchemaTyp = 'Aggregate' | 'Entity' | 'ValueObject' | 'Enum' | 'DTO' | 'Metadata'

export interface Module {
  $id: string
}

export interface Schema {
  $id: string
  type: string
  properties?: Schema[]
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  items?: Schema
  additionalProperties?: boolean
  examples?: unknown[]
  required?: string[]
  'x-schema-typ': SchemaTyp
  'x-references': undefined | string | string[]
}
