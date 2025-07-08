import * as tmp from 'tmp'
import { Model, type Module, type Schema } from '../../reader/Reader'
import { javaGenerator } from './JavaGenerator'
import { defaultJavaBasicTypeMap, defaultJavaFormatMap, type JavaPluginOptions } from './JavaPlugin'
import { loadTemplate } from '../../writer/WriterHelpers'
import { promises as fs } from 'fs'
import path from 'path'
import { testApplication, testModule, testSchema, testInterfaceSchema, testEnumSchema, testModel } from '../../testData'

describe('JavaGenerator', () => {
  const options: JavaPluginOptions = {
    mainPackageName: 'com.example',
    modelPackageName: 'model',
    getPackageName: undefined,
    useLombok: true,
    srcDir: undefined,
    basicTypeMap: { ...defaultJavaBasicTypeMap, ...defaultJavaFormatMap },
    classTemplate: loadTemplate(path.join(__dirname, 'class.hbs')),
    enumTemplate: loadTemplate(path.join(__dirname, 'enum.hbs')),
    interfaceTemplate: loadTemplate(path.join(__dirname, 'interface.hbs')),
    ignoreAdditionalFiles: false,
    linkSrcDir: undefined,
  }

  test('empty model', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { application: testApplication(), modules: [], schemas: [] }
    await javaGenerator(model, tmpDir.name, options)

    const files = await fs.readdir(tmpDir.name)
    expect(files).toEqual([])
  })

  test('simple model', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    await javaGenerator(testModel(), tmpDir.name, options)

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
    const schema: Schema = { ...testSchema(), additionalProperties: { type: 'integer' } }
    const model = { ...testModel(), schemas: [schema] }
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

  test('map', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema: Schema = { ...testSchema(), properties: { map: { type: 'object', additionalProperties: { type: 'number', format: 'int32' } } } }
    const model: Model = { ...testModel(), schemas: [schema] }
    await javaGenerator(model, tmpDir.name, options)

    const baseFiles = await fs.readdir(tmpDir.name)
    expect(baseFiles).toEqual(['Module'])
    const moduleFiles = await fs.readdir(path.join(tmpDir.name, 'Module'))
    expect(moduleFiles).toEqual(['java'])
    const javaFiles = await fs.readdir(path.join(tmpDir.name, 'Module', 'java'))
    expect(javaFiles).toEqual(['Schema.java'])
    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import java.util.Map;')
    expect(content).toContain('  private Map<String, Integer> map;')
  })

  test('additionalProperties false', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema: Schema = { ...testSchema(), additionalProperties: false }
    const model = { ...testModel(), schemas: [schema] }
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
    const schema: Schema = { ...testSchema(), additionalProperties: true }
    const model = { ...testModel(), schemas: [schema] }
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
    await javaGenerator(testModel(), tmpDir.name, { ...options, useLombok: true })

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import lombok.*;')
    expect(content).toContain('@Builder')
  })

  test('no lombok', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    await javaGenerator(testModel(), tmpDir.name, { ...options, useLombok: false })

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).not.toContain('import lombok.*;')
    expect(content).not.toContain('@Builder')
  })

  test('implements interface', async () => {
    const module2: Module = { ...testModule(), $id: '/Module2', title: 'Module 2' }
    const schema2: Schema = { ...testInterfaceSchema(), $id: '/Module2/Schema2.yaml', oneOf: [{ $ref: '../Module/Schema.yaml' }] }
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { ...testModel(), modules: [testModule(), module2], schemas: [testSchema(), schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Schema.java', 'utf-8')).toString()
    expect(content).toContain('import com.example.module2.model.Schema2;')
    expect(content).toContain('public class Schema implements Schema2 {')
  })

  test('SubSchema', async () => {
    const schema2: Schema = { ...testInterfaceSchema(), oneOf: [{ $ref: '#/definitions/SubSchema' }], definitions: { SubSchema: { type: 'object', additionalProperties: false, properties: {}, required: [] } } }

    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { ...testModel(), schemas: [testSchema(), schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/InterfaceSubSchema.java', 'utf-8')).toString()
    expect(content).toContain('public class InterfaceSubSchema implements Interface {')
  })

  test('Interface', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { ...testModel(), schemas: [testSchema(), testInterfaceSchema()] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Interface.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module.model;')
    expect(content).toContain('public interface Interface {')
  })

  test('Interface with properties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema2: Schema = { ...testInterfaceSchema(), properties: { prop: { type: 'string' } }, required: [] }
    const model = { ...testModel(), schemas: [testSchema(), schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Interface.java', 'utf-8')).toString()
    expect(content).toContain('public interface Interface {')
    expect(content).toContain('String getProp();')
    expect(content).toContain('void setProp(String value);')
  })

  test('Enum', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { ...testModel(), schemas: [testEnumSchema()] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Enum.java', 'utf-8')).toString()
    expect(content).toContain('package com.example.module.model;')
    expect(content).toContain('public enum Enum {')
    expect(content).toContain('A')
  })

  test('Enum Descriptions', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema2 = { ...testEnumSchema(), 'description': 'Enum description', 'x-enum-description': { A: 'Description A' } }
    const model = { ...testModel(), schemas: [schema2] }
    await javaGenerator(model, tmpDir.name, options)

    const content = (await fs.readFile(tmpDir.name + '/Module/java/Enum.java', 'utf-8')).toString()
    expect(content).toContain('// Enum description')
    expect(content).toContain('  // Description A')
  })

  test('Links', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const schema: Schema = { ...testSchema(), definitions: { definition1: { type: 'object', properties: {}, additionalProperties: false, required: [] } } }
    const model = { ...testModel(), schemas: [schema] }
    await javaGenerator(model, tmpDir.name, options)
    expect(schema['x-links']).toEqual([{ text: 'Java-File', link: './java/Schema.java' }, { text: 'Java-File (definition1)', link: './java/SchemaDefinition1.java' }])
    expect(model.modules[0].links).toEqual([{ text: 'Java-Files', link: './java' }])
  })
})
