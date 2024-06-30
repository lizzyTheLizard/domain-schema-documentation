import * as tmp from 'tmp'
import { getPropertiesFromImplementation } from './JavaParser'
import path from 'path'
import { promises as fs } from 'fs'

describe('JavaParser', () => {
  test('Empty Class', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({})
  })

  test('Basic Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private String name;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ name: { type: 'CLASS', fullName: 'String' } })
  })

  test('Static Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private static String name;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ })
  })

  test('Array Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private String[] name;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } })
  })

  test('Multiple Properties', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private String name, name2;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ name: { type: 'CLASS', fullName: 'String' }, name2: { type: 'CLASS', fullName: 'String' } })
  })

  test('List Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'import java.util.List;\npublic class ExampleClass {private List<String> name;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } })
  })

  test('List Property Without Import', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private java.util.List<String> name;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } })
  })

  test('List and Array Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private java.util.List<String[]> name;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } } })
  })

  test('Basic Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private Integer age;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ age: { type: 'CLASS', fullName: 'Integer' } })
  })

  test('Basic Property Unboxed', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private int age;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ age: { type: 'CLASS', fullName: 'Integer' } })
  })

  test('Reference Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'import com.example.Test; public class ExampleClass {private Test test;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.Test' } })
  })

  test('Reference Property Without Import', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'public class ExampleClass {private com.example.Test test;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.Test' } })
  })

  test('Reference Property Array', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'import com.example.Test;\n public class ExampleClass {private Test[] test;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ test: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'com.example.Test' } } })
  })

  test('Reference Property Collection', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'import com.example.Test;\nimport java.util.Collection;\n public class ExampleClass {private Collection<Test> test;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ test: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'com.example.Test' } } })
  })

  test('Reference Property Same Package', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'package com.example.a; public class ExampleClass {private Test test;}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.a.Test' } })
  })

  test('Record Property', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'ExampleClass.java')
    await fs.writeFile(filename, 'import com.example.Test;\n public record ExampleClass (Test test) {}')
    const result = await getPropertiesFromImplementation(filename)
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.Test' } })
  })
})
