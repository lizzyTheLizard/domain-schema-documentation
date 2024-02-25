import { type Schema } from './Schema.ts'

export interface Input {
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
