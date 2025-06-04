# Module
![Static Badge](https://img.shields.io/badge/Color--Tag-Blue-blue)
![Static Badge](https://img.shields.io/badge/Without%20Value-green)
![Static Badge](https://img.shields.io/badge/Validator%20Errors-3-red)

> - A Todo

This is an integration test for the application

## Schemas
```mermaid
classDiagram
namespace Module {
  class _Module_Interface_yml["Interface"]
  class OneOf2["OneOf2"]
  class OneOf1["OneOf1"]
  class _Module_Object_yaml["Object"]
  class SubInterface["SubInterface"]
  class SubInterfaceOneOf3["SubInterfaceOneOf3"]
  class SubInterfaceOneOf2["SubInterfaceOneOf2"]
  class SubObject["SubObject"]
  class ObjectMapAdditionalProperties["ObjectMapAdditionalProperties"]
  class _Module_Tags_yaml["Tags"]
}
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
}
_Module2_Object2_yaml o-- _Module_Object_yaml :reference1
_Module2_Object2_yaml ..> _Module_Object_yaml :reference2
_Module2_Object2_yaml *-- _Module_Object_yaml :reference3
_Module2_Object2_yaml --> _Module_Object_yaml :reference4
_Module_Interface_yml <|-- OneOf1 
_Module_Interface_yml <|-- OneOf2 
_Module_Object_yaml o--" N" ObjectMapAdditionalProperties :objectMap
_Module_Object_yaml o-- SubObject :subObject
_Module_Object_yaml o-- SubInterface :subInterface
SubInterface <|-- _Module_Object_yaml 
SubInterface <|-- SubInterfaceOneOf2 
SubInterface <|-- SubInterfaceOneOf3 
SubInterfaceOneOf3 <|-- _Module_Object_yaml 
SubInterfaceOneOf3 <|-- _Module_Interface_yml 
click _Module_Interface_yml href "./Interface.yml.html" "Interface"
click OneOf2 href "./Interface.yml.html" "Interface"
click OneOf1 href "./Interface.yml.html" "Interface"
click _Module_Object_yaml href "./Object.yaml.html" "Object"
click SubInterface href "./Object.yaml.html" "Object"
click SubInterfaceOneOf3 href "./Object.yaml.html" "Object"
click SubInterfaceOneOf2 href "./Object.yaml.html" "Object"
click SubObject href "./Object.yaml.html" "Object"
click ObjectMapAdditionalProperties href "./Object.yaml.html" "Object"
click _Module_Tags_yaml href "./Tags.yaml.html" "Tags"
click _Module2_Object2_yaml href "../Module2/Object2.yaml.html" "Object 2"
```
| Name | Type | Description |
|------|-----|-------------|
| [Interface](./Interface.yml.md) | Other | An interface |
| [Object](./Object.yaml.md) | Entity | A simple object |
| [Tags](./Tags.yaml.md) | ValueObject | An example for tags etc. |

## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | An error |
| WRONG | Schema &#x27;Interface&#x27; has 1 validation error |
| WRONG | Schema &#x27;Tags&#x27; has 2 validation errors |

## Links
1. [Link](http://www.google.com)
1. [Local-Link](./Module/index.yaml)
1. [Generated Java-Files](./java)
