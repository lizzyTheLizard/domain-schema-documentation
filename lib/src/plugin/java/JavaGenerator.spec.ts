import * as tmp from 'tmp'
import { type InterfaceDefinition, type Application, type Module, type Schema, type EnumDefinition } from '../../reader/Reader'
import { javaGenerator } from './JavaGenerator'
import { defaultJavaBasicTypeMap, defaultJavaFormatMap, type JavaPluginOptions } from './JavaPlugin'
import { loadTemplate } from '../../writer/WriterHelpers'
import { promises as fs } from 'fs'
import path from 'path'

describe('JavaGenerator', () => {
  const application: Application = { title: 'Application', description: 'Application description', errors: [], todos: [], links: [] }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description', errors: [], todos: [], links: [] }
  const module2: Module = { $id: '/Module2', title: 'Module 2', description: 'Module description', errors: [], todos: [], links: [] }
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {},
    'x-errors': [],
    'x-links': [],
    'x-todos': []

  }
  const enumSchema: Schema & EnumDefinition = {
    $id: '/Module/EnumSchema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'string',
    definitions: {},
    enum: ['A', 'B'],
    description: 'Enum description',
    'x-enum-description': { A: 'Description A', B: 'Description B' },
    'x-errors': [],
    'x-links': [],
    'x-todos': []
  }
  const oneOfSchema: Schema & InterfaceDefinition = {
    $id: '/Module2/Schema2.yaml',
    'x-schema-type': 'Other',
    title: 'OneOf Schema',
    type: 'object',
    oneOf: [{ $ref: '../Module/Schema.yaml' }, { $ref: '#/definitions/SubSchema' }],
    definitions: { SubSchema: { type: 'object', properties: {}, required: [] } },
    properties: {},
    required: [],
    'x-errors': [],
    'x-links': [],
    'x-todos': []
  }
  const options: JavaPluginOptions = {
    mainPackageName: 'com.example',
    modelPackageName: 'model',
    useLombok: true,
    srcDir: undefined,
    basicTypeMap: { ...defaultJavaBasicTypeMap, ...defaultJavaFormatMap },
    classTemplate: loadTemplate(path.join(__dirname, 'class.hbs')),
    enumTemplate: loadTemplate(path.join(__dirname, 'enum.hbs')),
    interfaceTemplate: loadTemplate(path.join(__dirname, 'interface.hbs')),
    ignoreAdditionalFiles: false
  }

  test('empty model', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [], schemas: [] }
    await javaGenerator(model, tmpDir.name, options)

    const files = await fs.readdir(tmpDir.name)
    expect(files).toEqual([])
  })

  test('simple model', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module], schemas: [schema] }
    await javaGenerator(model, tmpDir.name, options)

    const baseFiles = await fs.readdir(tmpDir.name)
    expect(baseFiles).toEqual(['Module'])
    const moduleFiles = await fs.readdir(path.join(tmpDir.name, 'Module'))
    expect(moduleFiles).toEqual(['java'])
    const javaFiles = await fs.readdir(path.join(tmpDir.name, 'Module', 'java'))
    expect(javaFiles).toEqual(['Schema.java'])
    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module.model;')
    expect(content).toContain('public class Schema {')
  })

  test('additionalProperties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema2: Schema = { ...schema, additionalProperties: { type: 'integer' } }
    const model = { application, modules: [module], schemas: [schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const baseFiles = await fs.readdir(tmpDir.name)
    expect(baseFiles).toEqual(['Module'])
    const moduleFiles = await fs.readdir(path.join(tmpDir.name, 'Module'))
    expect(moduleFiles).toEqual(['java'])
    const javaFiles = await fs.readdir(path.join(tmpDir.name, 'Module', 'java'))
    expect(javaFiles).toEqual(['Schema.java'])
    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import java.util.Map;')
    expect(content).toContain('  private Map<String, Integer> additionalProperties;')
  })

  test('additionalProperties false', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema2: Schema = { ...schema, additionalProperties: false }
    const model = { application, modules: [module], schemas: [schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const baseFiles = await fs.readdir(tmpDir.name)
    expect(baseFiles).toEqual(['Module'])
    const moduleFiles = await fs.readdir(path.join(tmpDir.name, 'Module'))
    expect(moduleFiles).toEqual(['java'])
    const javaFiles = await fs.readdir(path.join(tmpDir.name, 'Module', 'java'))
    expect(javaFiles).toEqual(['Schema.java'])
    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).not.toContain('import java.util.Map;')
  })

  test('additionalProperties true', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema2: Schema = { ...schema, additionalProperties: true }
    const model = { application, modules: [module], schemas: [schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const baseFiles = await fs.readdir(tmpDir.name)
    expect(baseFiles).toEqual(['Module'])
    const moduleFiles = await fs.readdir(path.join(tmpDir.name, 'Module'))
    expect(moduleFiles).toEqual(['java'])
    const javaFiles = await fs.readdir(path.join(tmpDir.name, 'Module', 'java'))
    expect(javaFiles).toEqual(['Schema.java'])
    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import java.util.Map;')
    expect(content).toContain('  private Map<String, Object> additionalProperties;')
  })

  test('lombok', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module], schemas: [schema] }
    await javaGenerator(model, tmpDir.name, { ...options, useLombok: true })

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import lombok.*;')
    expect(content).toContain('@Builder')
  })

  test('no lombok', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module], schemas: [schema] }
    await javaGenerator(model, tmpDir.name, { ...options, useLombok: false })

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).not.toContain('import lombok.*;')
    expect(content).not.toContain('@Builder')
  })

  test('implements interface', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchema] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import com.example.module2.model.Schema2;')
    expect(content).toContain('public class Schema implements Schema2 {')
  })

  test('SubSchema', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchema] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module2/java/Schema2SubSchema.java', 'utf-8')).toString()
    expect(content).not.toContain('import com.example.module2.model.Schema2;')
    expect(content).toContain('public class Schema2SubSchema implements Schema2 {')
  })

  test('Interface', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchema] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module2/java/Schema2.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module2.model;')
    expect(content).toContain('public interface Schema2 {')
  })

  test('Interface with properties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const oneOfSchemaWithProperties: Schema = { ...oneOfSchema, properties: { prop: { type: 'string' } }, required: [] }
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchemaWithProperties] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module2/java/Schema2.java', 'utf-8')).toString()
    expect(content).toContain('public interface Schema2 {')
    expect(content).toContain('String getProp();')
    expect(content).toContain('void setProp(String value);')
  })

  test('Enum', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module], schemas: [enumSchema] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/EnumSchema.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module.model;')
    expect(content).toContain('public enum EnumSchema {')
    expect(content).toContain('A,')
    expect(content).toContain('B')
  })

  test('Descriptions', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application, modules: [module], schemas: [enumSchema] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/EnumSchema.java', 'utf-8')).toString()
    expect(content).toContain('// Enum description')
    expect(content).toContain('  // Description A')
  })

  test('Links', async () => {
    schema['x-links'] = []; module.links = []
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema2: Schema = { ...schema, definitions: { definition1: { type: 'object', properties: {}, required: [] } } }
    const model = { application, modules: [module], schemas: [schema2] }
    await javaGenerator(model, tmpDir.name, options)
    expect(schema2['x-links']).toEqual([{ text: 'Java-File', href: './java/Schema.java' }, { text: 'Java-File (definition1)', href: './java/SchemaDefinition1.java' }])
    expect(module.links).toEqual([{ text: 'Java-Files', href: './java' }])
  })
})
