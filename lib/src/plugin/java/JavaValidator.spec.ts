import { type Schema } from '../../reader/Reader'
import * as tmp from 'tmp'
import path from 'path'
import { promises as fs } from 'fs'
import { defaultJavaBasicTypeMap, type JavaPluginOptions } from './JavaPlugin'
import { javaValidator } from './JavaValidator'
import { testModel, testSchema } from '../../testData'

describe('JavaValidator', () => {
  test('No Src Dir Given', async () => {
    const options = { srcDir: undefined } as any as JavaPluginOptions
    const model = testModel()
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([])
  })

  test('Implementation is missing', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    const model = testModel()
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: '\'module.Schema\' should exist but is missing in the implementation', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Empty Schema', async () => {
    const schema = { ...testSchema(), properties: {} }
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema {}')
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([])
  })

  test('Correct Implementation', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private Schema test; }')
    const schema = { ...testSchema(), properties: { test: { $ref: '#' } } }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([])
  })

  test('Missing Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const schema2 = { ...testSchema(), properties: { test: { $ref: '#' } } }
    const model = { ...testModel(), schemas: [schema2] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: 'Property \'test\' is missing in class \'module.Schema\'', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Missing Additional Properties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema {}')
    const schema: Schema = { ...testSchema(), additionalProperties: { type: 'string' }, properties: {} }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: 'Additional Properties are missing in class \'module.Schema\'', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Wrong Additional Properties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; import java.util.Map; public class Schema { private Map<String, Integer> additionalProperties; }')
    const schema: Schema = { ...testSchema(), additionalProperties: { type: 'string' }, properties: {} }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name, basicTypeMap: defaultJavaBasicTypeMap } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: 'Additional Properties have type \'Map<String, Integer>\' in class \'module.Schema\' but should have type \'Map<String, String>\'', type: 'WRONG' }])
  })

  test('Excess Additional Properties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; import java.util.Map; public class Schema { private Map<String, Integer> additionalProperties; }')
    const schema: Schema = { ...testSchema(), additionalProperties: false, properties: {} }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name, basicTypeMap: defaultJavaBasicTypeMap } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: 'Additional Properties should not exist in class \'module.Schema\'', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('Excess Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private Schema test; }')
    const schema: Schema = { ...testSchema(), properties: {} }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: 'Property \'test\' should not exist in class \'module.Schema\'', type: 'NOT_IN_DOMAIN_MODEL' }])
  })

  test('Wrong Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { private String test; }')
    const schema = { ...testSchema(), properties: { test: { $ref: '#' } } }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: 'Property \'test\' has type \'String\' in class \'module.Schema\' but should have type \'module.Schema\'', type: 'WRONG' }])
  })

  test('Missing definition Implementation', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const schema: Schema = { ...testSchema(), properties: {}, definitions: { test: { type: 'object', required: [], properties: { p1: { $ref: '#' } } } } }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([{ text: '\'module.SchemaTest\' should exist but is missing in the implementation', type: 'MISSING_IN_IMPLEMENTATION' }])
  })

  test('Correct Definition Implementation', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema { }')
    const filename2 = path.join(tmpDir.name, 'module', 'SchemaTest.java')
    await fs.writeFile(filename2, 'package module; public class SchemaTest { private Schema p1; }')
    const schema: Schema = { ...testSchema(), properties: {}, definitions: { test: { type: 'object', required: [], properties: { p1: { $ref: '#' } } } } }
    const model = { ...testModel(), schemas: [schema] }
    const options = { srcDir: tmpDir.name } as any as JavaPluginOptions
    await javaValidator(model, options)
    expect(model.application.errors).toEqual([])
    expect(model.modules[0].errors).toEqual([])
    expect(model.schemas[0]['x-errors']).toEqual([])
  })
})
