import path from 'path'
import { type Input, type Module } from './Input.ts'
import { type Schema, type SchemaType } from './Schema.ts'

export function getName (input: { $id: string } | string): string {
  const name = typeof input === 'string' ? input : input.$id
  return path.basename(name, path.extname(name))
}

export function getIdWithoutEnding (input: { $id: string } | string): string {
  const name = typeof input === 'string' ? input : input.$id
  return name.replace(path.extname(name), '')
}

export function getSchemasForModule (input: Input, module: Module): Schema[] {
  return input.schemas.filter(schema => schema.$id.startsWith(module.$id))
}

export function getSchemasForModuleAndTyp (input: Input, module: Module, typ: SchemaType): Schema[] {
  return getSchemasForModule(input, module).filter(schema => schema['x-schema-type'] === typ)
}

export function capitalize (s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
