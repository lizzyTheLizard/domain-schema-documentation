import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator'
import { type Application, type Model, type Module, type Schema } from '../reader/Reader'

describe('mermaidDiagramGenerator', () => {
  const application: Application = {
    title: 'Test Application',
    description: 'Test Application Description'
  }
  const module: Module = {
    $id: '/test',
    title: 'Test Module',
    description: 'Test Module Description'
  }
  const module2: Module = { ...module, $id: '/test2', title: 'Test 2' }
  const schema: Schema = {
    $id: '/test/Schema.yaml',
    title: 'Test Schema',
    description: 'Test Schema Description',
    'x-schema-type': 'Aggregate',
    type: 'object',
    properties: { id: { type: 'string' } },
    definitions: {},
    required: []
  }
  const schema2: Schema = { ...schema, $id: '/test2/Schema.yaml', properties: { ref: { $ref: '../test/Schema.yaml' } } }

  test('applicationDiagram', () => {
    const model: Model = { application, modules: [module, module2], schemas: [schema, schema2] }
    const result = applicationDiagram(model)
    expect(result).toEqual(
`classDiagram
class _test["Test Module"]
class _test2["Test 2"]
_test2 ..> _test
click _test href "./test/index.html" "Test Module"
click _test2 href "./test2/index.html" "Test 2"`)
  })

  test('moduleDiagram', () => {
    const model: Model = { application, modules: [module, module2], schemas: [schema, schema2] }
    const result = moduleDiagram(model, module)
    expect(result).toEqual(
        `classDiagram
namespace Test Module {
  class _test_Schema_yaml["Test Schema"]
}
namespace Test 2 {
  class _test2_Schema_yaml["Test Schema"]
}
_test2_Schema_yaml ..> _test_Schema_yaml :ref
click _test_Schema_yaml href "./Schema.yaml.html" "Test Schema"
click _test2_Schema_yaml href "../test2/Schema.yaml.html" "Test Schema"`)
  })

  test('schemaDiagramm with dependencies', () => {
    const model: Model = { application, modules: [module, module2], schemas: [schema, schema2] }
    const result = schemaDiagramm(model, schema)
    expect(result).toEqual(
        `classDiagram
namespace Test Module {
  class _test_Schema_yaml["Test Schema"]
}
namespace Test 2 {
  class _test2_Schema_yaml["Test Schema"]
}
_test2_Schema_yaml ..> _test_Schema_yaml :ref
click _test_Schema_yaml href "./Schema.yaml.html" "Test Schema"
click _test2_Schema_yaml href "../test2/Schema.yaml.html" "Test Schema"`)
  })
})
