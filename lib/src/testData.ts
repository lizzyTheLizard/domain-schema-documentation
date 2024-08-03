/* eslint-disable jsdoc/require-jsdoc */
import type { Application, Module, Model, Schema } from './reader/Reader'
import type { EnumDefinition, InterfaceDefinition, ObjectDefinition } from './schemaNormalizer/NormalizedSchema'

export function testApplication (): Application {
  return {
    title: 'Title',
    description: 'Description',
    links: [],
    todos: [],
    errors: [],
    tags: []
  }
}

export function testModule (): Module {
  return {
    $id: '/Module',
    title: 'Module',
    description: 'Description',
    links: [],
    todos: [],
    errors: [],
    tags: []
  }
}

export function testSchema (): ObjectDefinition & Schema {
  return {
    $id: '/Module/Schema.yaml',
    title: 'Schema',
    'x-schema-type': 'Aggregate',
    type: 'object',
    properties: { key: { type: 'number' } },
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': [],
    'x-tags': []
  }
}

export function testInterfaceSchema (): InterfaceDefinition & Schema {
  return {
    $id: '/Module/Interface.yaml',
    title: 'Interface',
    'x-schema-type': 'Aggregate',
    type: 'object',
    oneOf: [{ $ref: './Schema.yaml' }],
    properties: { field1: { type: 'string' } },
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': [],
    'x-tags': []
  }
}

export function testEnumSchema (): EnumDefinition & Schema {
  return {
    $id: '/Module/Enum.yaml',
    title: 'Schema',
    'x-schema-type': 'Aggregate',
    type: 'string',
    enum: ['A'],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': [],
    'x-tags': []
  }
}

export function testModel (): Model {
  return {
    application: testApplication(),
    modules: [testModule()],
    schemas: [testSchema()]
  }
}
