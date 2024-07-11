/**
 * A reader is a function that reads a model from a source.
 */
export type Reader = () => Promise<Model>

/** A link to another resource */
export interface Link {
  /** Link text */
  text: string
  /** Link URL */
  href: string
}

/** Errors while verifing this input. Usually filed by the plugins, but could be given by the input as well */
export interface ImplementationError {
  text: string
  type: ImplementationErrorType
}

/** Type of the verification error */
export type ImplementationErrorType = 'NOT_IN_DOMAIN_MODEL' | 'MISSING_IN_IMPLEMENTATION' | 'WRONG' | 'OTHER'

/** A single property in an object schema */
export type Property = ArrayProperty | RefProperty | BasicProperty

/** An array property */
export interface ArrayProperty {
  /** The type of the property, as defined in JSON Schema */
  type: 'array'
  /** The items of the array, as defined in JSON Schema */
  items: Property
}

/** A reference property */
export interface RefProperty {
  /** The reference to another schema, as defined in JSON Schema */
  $ref: string
}

/** A basic property */
export interface BasicProperty {
  /** The type of the property, as defined in JSON Schema */
  type: 'boolean' | 'integer' | 'null' | 'number' | 'string'
  /** The format of the property, as defined in JSON Schema */
  format?: string
  /** A reference to another schema, if the value of this property is an ID of this type. Used for documentation */
  'x-references'?: string | string[]
}

/** A type definition. Can be the root of a schema, or a sub-definition */
export type Definition = InterfaceDefinition | EnumDefinition | ObjectDefinition

interface DefinitionCommon {
  /** The description of the definition, as defined in JSON Schema */
  description?: string
  /** The type of the definition, as defined in JSON Schema */
  type: 'object' | 'string'
}

/** An Enum definition */
export interface EnumDefinition extends DefinitionCommon {
  /** The type of the definition, as defined in JSON Schema */
  type: 'string'
  /** The values of the enum, as defined in JSON Schema */
  enum: string[]
  /** The description of the enum values, for documentation */
  'x-enum-description'?: Record<string, string>
}

/** An Object definition */
export interface ObjectDefinition extends DefinitionCommon {
  /** The type of the definition, as defined in JSON Schema */
  type: 'object'
  /** The properties of the object, as defined in JSON Schema */
  properties: Record<string, Property>
  /** The required properties of the object, as defined in JSON Schema */
  required: string[]
  additionalProperties?: boolean | Property
}

/** An Interface definition */
export interface InterfaceDefinition extends ObjectDefinition {
  /** The implementing schemas, as defined in JSON Schema */
  oneOf: RefProperty[]
}

/** The type of the schema, used for documentation */
export type SchemaType = 'Aggregate' | 'Entity' | 'ValueObject' | 'ReferenceData' | 'Other'
/** A schema in the application */
export type Schema = SchemaCommon & Definition

/** Additional values only form Schemas but not for definitions */
export interface SchemaCommon {
  /** The title of the schema, prefix must be the ID of the module, as defined in JSON Schema */
  $id: string
  /** The title of the schema, as defined in JSON Schema */
  title: string
  /** Examples how an object of this schema can look like, as defined in JSON Schema */
  examples?: unknown[]
  /** Additional sub-definitions, as defined in JSON Schema */
  definitions: Record<string, Definition>
  /** The type of the schema, used for documentation */
  'x-schema-type': SchemaType
  /** TODOS that still needs to be changed on the domain model, for documentation */
  'x-todos': string[]
  /** Links to other resources */
  'x-links': Link[]
  /** Errors while verifing this input. Usually filed by the plugins, but could be given by the input as well */
  'x-errors': ImplementationError[]
}

/** A module in the application */
export interface Module {
  /** The title of the module */
  $id: string
  /** The description of the module */
  title: string
  /** The description of the module */
  description: string
  /** TODOS that still needs to be changed on the domain model, for documentation */
  todos: string[]
  /** Links to other resources */
  links: Link[]
  /** Errors while verifing this input. Usually filed by the plugins, but could be given by the input as well */
  errors: ImplementationError[]
}

/** The application definition */
export interface Application {
  /** The title of the application */
  title: string
  /** The description of the application */
  description: string
  /** TODOS that still needs to be changed on the domain model, for documentation */
  todos: string[]
  /** Links to other resources */
  links: Link[]
  /** Errors while verifing this input. Usually filed by the plugins, but could be given by the input as well */
  errors: ImplementationError[]
}

/** The full model that is read from the input folder */
export interface Model {
  /** The application definition */
  application: Application
  /** The modules in the application */
  modules: Module[]
  /** The schemas in the application */
  schemas: Schema[]
}
