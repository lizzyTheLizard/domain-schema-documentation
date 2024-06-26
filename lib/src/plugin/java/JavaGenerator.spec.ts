import * as tmp from 'tmp'
import { type InterfaceDefinition, type Application, type Module, type Schema, type EnumDefinition } from '../../reader/Reader'
import { javaGenerator } from './JavaGenerator'
import { defaultJavaBasicTypeMap, defaultJavaFormatMap, type JavaPluginOptions } from './JavaPlugin'
import { loadTemplate } from '../../writer/WriterHelpers'
import { promises as fs } from 'fs'
import path from 'path'

describe('JavaGenerator', () => {
  const application: Application = { title: 'Application', description: 'Application description' }
  const module: Module = { $id: '/Module', title: 'Module', description: 'Module description' }
  const module2: Module = { $id: '/Module2', title: 'Module 2', description: 'Module description' }
  const schema: Schema = {
    $id: '/Module/Schema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'object',
    properties: {},
    required: [],
    definitions: {}
  }
  const enumSchema: Schema & EnumDefinition = {
    $id: '/Module/EnumSchema.yaml',
    'x-schema-type': 'Entity',
    title: 'Schema 1',
    type: 'string',
    definitions: {},
    enum: ['A', 'B'],
    description: 'Enum description',
    'x-enum-description': { A: 'Description A', B: 'Description B' }
  }
  const oneOfSchema: Schema & InterfaceDefinition = {
    $id: '/Module2/Schema2.yaml',
    'x-schema-type': 'Other',
    title: 'OneOf Schema',
    type: 'object',
    oneOf: [{ $ref: '../Module/Schema.yaml' }, { $ref: '#/definitions/SubSchema' }],
    definitions: { SubSchema: { type: 'object', properties: {}, required: [] } }
  }
  const options: JavaPluginOptions = {
    mainPackageName: 'com.example',
    modelPackageName: 'model',
    useLombok: true,
    basicTypeMap: { ...defaultJavaBasicTypeMap, ...defaultJavaFormatMap },
    classTemplate: loadTemplate(path.join(__dirname, 'class.hbs')),
    enumTemplate: loadTemplate(path.join(__dirname, 'enum.hbs')),
    interfaceTemplate: loadTemplate(path.join(__dirname, 'interface.hbs'))
  }

  test('empty model', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [], schemas: [] }
    await target(model)

    const files = await fs.readdir(tmpDir.name)
    expect(files).toEqual([])
  })

  test('simple model', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [module], schemas: [schema] }
    await target(model)

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

  test('lombok', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, { ...options, useLombok: true })
    const model = { application, modules: [module], schemas: [schema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import lombok.*;')
    expect(content).toContain('@Builder')
  })

  test('no lombok', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, { ...options, useLombok: false })
    const model = { application, modules: [module], schemas: [schema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).not.toContain('import lombok.*;')
    expect(content).not.toContain('@Builder')
  })

  test('implements interface', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import com.example.module2.model.Schema2;')
    expect(content).toContain('public class Schema implements Schema2 {')
  })

  test('SubSchema', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module2/java/Schema2SubSchema.java', 'utf-8')).toString()
    expect(content).not.toContain('import com.example.module2.model.Schema2;')
    expect(content).toContain('public class Schema2SubSchema implements Schema2 {')
  })

  test('Interface', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [module, module2], schemas: [schema, oneOfSchema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module2/java/Schema2.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module2.model;')
    expect(content).toContain('public interface Schema2 {')
  })

  test('Enum', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [module], schemas: [enumSchema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/EnumSchema.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module.model;')
    expect(content).toContain('public enum EnumSchema {')
    expect(content).toContain('A,')
    expect(content).toContain('B')
  })

  test('Descriptions', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const target = javaGenerator(tmpDir.name, options)
    const model = { application, modules: [module], schemas: [enumSchema] }
    await target(model)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/EnumSchema.java', 'utf-8')).toString()
    expect(content).toContain('// Enum description')
    expect(content).toContain('  // Description A')
  })
})
