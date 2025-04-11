import { parseClass, parseEnum, parseInterface } from './JavaParser'

describe('JavaParser', () => {
  test('Empty Class', () => {
    const result = parseClass('public class ExampleClass {}')
    expect(result).toEqual({})
  })

  test('Basic Property', () => {
    const result = parseClass('public class ExampleClass {private String name;}')
    expect(result).toEqual({ name: { type: 'CLASS', fullName: 'String' } })
  })

  test('Static Property', () => {
    const result = parseClass('public class ExampleClass {private static String name = "test";}')
    expect(result).toEqual({})
  })

  test('Array Property', () => {
    const result = parseClass('public class ExampleClass {private String[] name;}')
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } })
  })

  test('Multiple Properties', () => {
    const result = parseClass('public class ExampleClass {private String name, name2;}')
    expect(result).toEqual({ name: { type: 'CLASS', fullName: 'String' }, name2: { type: 'CLASS', fullName: 'String' } })
  })

  test('List Property', () => {
    const result = parseClass('import java.util.List;\npublic class ExampleClass {private List<String> name;}')
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } })
  })

  test('List Property Without Import', () => {
    const result = parseClass('public class ExampleClass {private java.util.List<String> name;}')
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } })
  })

  test('List and Array Property', () => {
    const result = parseClass('public class ExampleClass {private java.util.List<String[]> name;}')
    expect(result).toEqual({ name: { type: 'COLLECTION', items: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'String' } } } })
  })

  test('Basic Property', () => {
    const result = parseClass('public class ExampleClass {private Integer age;}')
    expect(result).toEqual({ age: { type: 'CLASS', fullName: 'Integer' } })
  })

  test('Basic Property Unboxed', () => {
    const result = parseClass('public class ExampleClass {private int age;}')
    expect(result).toEqual({ age: { type: 'CLASS', fullName: 'Integer' } })
  })

  test('Reference Property', () => {
    const result = parseClass('import com.example.Test; public class ExampleClass {private Test test;}')
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.Test' } })
  })

  test('Reference Property Without Import', () => {
    const result = parseClass('public class ExampleClass {private com.example.Test test;}')
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.Test' } })
  })

  test('Reference Property Array', () => {
    const result = parseClass('import com.example.Test;\n public class ExampleClass {private Test[] test;}')
    expect(result).toEqual({ test: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'com.example.Test' } } })
  })

  test('Reference Property Collection', () => {
    const result = parseClass('import com.example.Test;\nimport java.util.Collection;\n public class ExampleClass {private Collection<Test> test;}')
    expect(result).toEqual({ test: { type: 'COLLECTION', items: { type: 'CLASS', fullName: 'com.example.Test' } } })
  })

  test('Reference Property Same Package', () => {
    const result = parseClass('package com.example.a; public class ExampleClass {private Test test;}')
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.a.Test' } })
  })

  test('Record Property', () => {
    const result = parseClass('import com.example.Test;\n public record ExampleClass (Test test) {}')
    expect(result).toEqual({ test: { type: 'CLASS', fullName: 'com.example.Test' } })
  })

  test('Interface', () => {
    const result = parseInterface('public interface ExampleClass {}')
    expect(result).toBeUndefined()
  })

  test('Enum', () => {
    const result = parseEnum('public enum ExampleClass { TestA, TestB}')
    expect(result).toEqual(['TestA', 'TestB'])
  })
})
