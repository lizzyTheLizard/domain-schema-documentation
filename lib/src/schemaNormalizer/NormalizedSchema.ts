/** A noralized schema */
export type NormalizedSchema<DefinitionExtension = unknown, PropertyExtension = unknown> = SchemaCommon<DefinitionExtension, PropertyExtension> & Definition<PropertyExtension> & DefinitionExtension

/** Additional values only for schemas but not for definitions */
export interface SchemaCommon<DefinitionExtension, PropertyExtension> {
  /** The title of the schema, prefix must be the ID of the module, as defined in JSON Schema */
  $id: string
  /** The title of the schema, as defined in JSON Schema */
  title: string
  /** Examples how an object of this schema can look like, as defined in JSON Schema */
  examples?: unknown[]
  /** Additional sub-definitions, as defined in JSON Schema */
  definitions: Record<string, Definition<PropertyExtension> & DefinitionExtension>
}

/** A type definition. Can be the root of a schema, or a sub-definition */
export type Definition<PropertyExtension = unknown> = InterfaceDefinition<PropertyExtension> | EnumDefinition | ObjectDefinition<PropertyExtension>

interface DefinitionCommon {
  /** The description of the definition, as defined in JSON Schema */
  description?: string
  /** The type of the definition, as defined in JSON Schema */
  type: 'object' | 'string'
  /** A comment */
  $comment?: string
}

/** An Enum definition */
export interface EnumDefinition extends DefinitionCommon {
  /** The type of the definition, as defined in JSON Schema */
  type: 'string'
  /** The values of the enum, as defined in JSON Schema */
  enum: string[]
}

/** An Object definition */
export interface ObjectDefinition<PropertyExtension = unknown> extends DefinitionCommon {
  /** The type of the definition, as defined in JSON Schema */
  type: 'object'
  /** The properties of the object, as defined in JSON Schema */
  properties: Record<string, Property<PropertyExtension> & PropertyExtension>
  /** The required properties of the object, as defined in JSON Schema */
  required: string[]
  additionalProperties: boolean | (Property<PropertyExtension> & PropertyExtension)
  /** Maximum number of properties */
  maxProperties?: number
  /** Minimum number of properties */
  minProperties?: number
}

/** An Interface definition */
export interface InterfaceDefinition<PropertyExtension = unknown> extends ObjectDefinition<PropertyExtension> {
  /** The implementing schemas, as defined in JSON Schema */
  oneOf: RefProperty[]
}

/** A single property in an object schema */
export type Property<PropertyExtension = unknown> = ArrayProperty<PropertyExtension> | RefProperty | BooleanProperty | StringProperty | NumberProperty | ObjectProperty | MapProperty<PropertyExtension>

/** An array property */
export interface PropertyBase {
  /** This property is read-only */
  readOnly?: boolean
  /** This property is write-only */
  writeOnly?: boolean
}

/** An array property */
export interface ArrayProperty<PropertyExtension = unknown> extends PropertyBase {
  /** The type of the property, as defined in JSON Schema */
  type: 'array'
  /** The items of the array, as defined in JSON Schema */
  items: Property<PropertyExtension> & PropertyExtension
  /** The maximum number of items in the array */
  maxItems?: number
  /** The minimum number of items in the array */
  minItems?: number
  /** If the items in the array must be unique */
  uniqueItems?: boolean
}

/** A reference property */
export interface RefProperty extends PropertyBase {
  /** The reference to another schema, as defined in JSON Schema */
  $ref: string
}

/** A reference property */
export interface ObjectProperty extends PropertyBase {
  type: 'object'
}

/** A reference property */
export interface MapProperty<PropertyExtension = unknown> extends PropertyBase {
  type: 'object'
  additionalProperties: boolean | (Property<PropertyExtension> & PropertyExtension)
}

/** A basic property */
export interface BooleanProperty extends PropertyBase {
  /** The type of the property, as defined in JSON Schema */
  type: 'boolean'
  /** The format of the property, as defined in JSON Schema */
  format?: string
  /** A constant value for this boolean */
  const?: boolean
  /** The default value of the property */
  default?: boolean
}

/** A basic string property */
export interface StringProperty extends PropertyBase {
  /** The type of the property, as defined in JSON Schema */
  type: 'string'
  /** The format of the property, as defined in JSON Schema */
  format?: string
  /** A constant value for this string */
  const?: string
  /** The default value of the property */
  default?: string
  /** The maximum length of the string */
  maxLength?: number
  /** The minimum length of the string */
  minLength?: number
  /** A regular expression that the string must match */
  pattern?: string
  /* The media type of the content within this string */
  contentMediaType?: string
  /* The encoding of the content within this string */
  contentEncoding?: string
}

/** A basic number property */
export interface NumberProperty extends PropertyBase {
  /** The type of the property, as defined in JSON Schema */
  type: 'number' | 'integer'
  /** The format of the property, as defined in JSON Schema */
  format?: string
  /** A constant value for this number */
  const?: number
  /** The default value of this number */
  default?: number
  /** Number must be a multiple of this value */
  multipleOf?: number
  /** The maximum value of the number */
  maximum?: number
  /** The exclusive maximum value of the number */
  exclusiveMaximum?: number
  /** The minimum value of the number */
  minimum?: number
  /** The exclusive minimum value of the number */
  exclusiveMinimum?: number
}
