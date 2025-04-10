import type { NormalizedSchema } from '../schemaNormalizer/NormalizedSchema'
import { DependencyType } from './GetDependencies'

/**
 * A reader is a function that reads a model from a source.
 */
export type Reader = () => Promise<Model>

/** The full model that is read from the input folder */
export interface Model {
  /** The application definition */
  application: Application
  /** The modules in the application */
  modules: Module[]
  /** The schemas in the application */
  schemas: Schema[]
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
  /** Tags for this application */
  tags: Tag[]
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
  /** Tags for this module */
  tags: Tag[]
}

export interface PropertyExtension { 'x-references'?: string | string[], 'x-enum-description'?: Record<string, string>, 'x-reference-type'?: DependencyType }

export type Schema = NormalizedSchema<unknown, PropertyExtension> & {
  /** The type of the schema, used for documentation */
  'x-schema-type': SchemaType
  /** TODOS that still needs to be changed on the domain model, for documentation */
  'x-todos': string[]
  /** Links to other resources */
  'x-links': Link[]
  /** Tags for this schema */
  'x-tags': Tag[]
  /** Errors while verifing this input. Usually filed by the plugins, but could be given by the input as well */
  'x-errors': ImplementationError[]
}

/** The type of the schema, used for documentation */
export type SchemaType = 'Aggregate' | 'Entity' | 'ValueObject' | 'ReferenceData' | 'Other'

/** A link to another resource */
export interface Link {
  /** Link text */
  text: string
  /** Link URL */
  link: string
}

/** A tag for a schema */
export interface Tag {
  /** Tag name */
  name: string
  /** The tag value */
  value?: string
  /** The color of the tag */
  color: string
}

/** Errors while verifing this input. Usually filed by the plugins, but could be given by the input as well */
export interface ImplementationError {
  text: string
  type: ImplementationErrorType
  details?: Link[]
}

/** Type of the verification error */
export type ImplementationErrorType = 'NOT_IN_DOMAIN_MODEL' | 'MISSING_IN_IMPLEMENTATION' | 'WRONG' | 'OTHER'
