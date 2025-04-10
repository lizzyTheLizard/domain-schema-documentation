import { applicationDiagram, moduleDiagram, schemaDiagramm } from './MermaidDiagramGenerator'
import { type Model, type Module, type Schema } from '../reader/Reader'
import { testModule, testSchema, testModel } from '../testData'

describe('mermaidDiagramGenerator', () => {
  const module1: Module = testModule()
  const module2: Module = { ...testModule(), $id: '/Module2', title: 'Test 2' }
  const schema1: Schema = testSchema()
  const schema2: Schema = { ...testSchema(), title: 'Test Schema 2', $id: '/Module2/Schema.yaml', properties: { ref: { $ref: '../Module/Schema.yaml' } } }

  test('applicationDiagram', () => {
    const model: Model = { ...testModel(), modules: [module1, module2], schemas: [schema1, schema2] }
    const result = applicationDiagram(model)
    expect(result).toEqual(
      `classDiagram
class _Module["Module"]
class _Module2["Test 2"]
_Module2 ..> _Module
click _Module href "./Module/index.html" "Module"
click _Module2 href "./Module2/index.html" "Test 2"`)
  })

  test('moduleDiagram', () => {
    const model: Model = { ...testModel(), modules: [module1, module2], schemas: [schema1, schema2] }
    const result = moduleDiagram(model, module1, true)
    expect(result).toEqual(
      `classDiagram
namespace Module {
  class _Module_Schema_yaml["Schema"]
}
namespace Test 2 {
  class _Module2_Schema_yaml["Test Schema 2"]
}
_Module2_Schema_yaml ..> _Module_Schema_yaml :ref
click _Module_Schema_yaml href "./Schema.yaml.html" "Schema"
click _Module2_Schema_yaml href "../Module2/Schema.yaml.html" "Test Schema 2"`)
  })

  test('schemaDiagramm with dependencies', () => {
    const model: Model = { ...testModel(), modules: [module1, module2], schemas: [schema1, schema2] }
    const result = schemaDiagramm(model, schema1, true)
    expect(result).toEqual(
      `classDiagram
namespace Module {
  class _Module_Schema_yaml["Schema"]
}
namespace Test 2 {
  class _Module2_Schema_yaml["Test Schema 2"]
}
_Module2_Schema_yaml ..> _Module_Schema_yaml :ref
click _Module_Schema_yaml href "./Schema.yaml.html" "Schema"
click _Module2_Schema_yaml href "../Module2/Schema.yaml.html" "Test Schema 2"`)
  })
})
