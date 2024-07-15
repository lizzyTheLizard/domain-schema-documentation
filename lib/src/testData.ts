import type { EnumDefinition, Application, Module, SchemaCommon, ObjectDefinition, InterfaceDefinition, Model } from './reader/Reader'

/**
 * Generate an application for unit testing
 * @returns An application
 */
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

/**
 * Generate a module for unit testing
 * @returns A module
 */
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

/**
 * Generate a schema for unit testing
 * @returns A schema
 */
export function testSchema (): ObjectDefinition & SchemaCommon {
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

/**
 * Generate an interface schema for unit testing
 * @returns A schema
 */
export function testInterfaceSchema (): InterfaceDefinition & SchemaCommon {
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

/**
 * Generate an enum schema for unit testing
 * @returns A schema
 */
export function testEnumSchema (): EnumDefinition & SchemaCommon {
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

/**
 * Generate a model for unit testing
 * @returns A model
 */
export function testModel (): Model {
  return {
    application: testApplication(),
    modules: [testModule()],
    schemas: [testSchema()]
  }
}
