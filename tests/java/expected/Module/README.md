# Module
> - [ ] 1 validation error
This is a first module

## Schemas
```mermaid
classDiagram
namespace Module {
  class _Module_Interface_yaml["Interface"]
  class TestProp["TestProp"]
  class Interface3["Interface3"]
  class OtherObject["OtherObject"]
  class _Module_Object_yaml["Object"]
}
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
}
_Module_Interface_yaml <|-- _Module_Object_yaml 
_Module_Interface_yaml <|-- OtherObject 
_Module_Interface_yaml <|-- Interface3 
_Module_Object_yaml ..> _Module2_Object2_yaml :obj2
click _Module_Interface_yaml href "./Interface.yaml.html" "Interface"
click TestProp href "./Interface.yaml.html" "Interface"
click Interface3 href "./Interface.yaml.html" "Interface"
click OtherObject href "./Interface.yaml.html" "Interface"
click _Module_Object_yaml href "./Object.yaml.html" "Object"
click _Module2_Object2_yaml href "../Module2/Object2.yaml.html" "Object 2"
```
| Name | Type | Description |
|------|-----|-------------|
| [Interface](./Interface.yaml.md) | Other | This is an interface |
| [Object](./Object.yaml.md) | Aggregate | This is an integration test for the application |

## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | Schema &#x27;Interface&#x27; has 4 validation errors |

## Links
1. [This is an existing link]()
1. [](https://example.com)
1. [Java-Files](./java)
