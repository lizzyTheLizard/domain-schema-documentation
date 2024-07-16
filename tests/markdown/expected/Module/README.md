# Module
![Static Badge](https://img.shields.io/badge/Color--Tag-Blue-blue)
![Static Badge](https://img.shields.io/badge/Without%20Value-green)
![Static Badge](https://img.shields.io/badge/Validator%20Errors-2-red)

> - A Todo

This is an integration test for the application

## Schemas
```mermaid
classDiagram
namespace Module {
  class _Module_Interface_yml["Interface"]
  class Interface1["Interface1"]
  class Interface2["Interface2"]
  class _Module_Object_yaml["Object"]
  class SubObject["SubObject"]
  class SubInterface["SubInterface"]
  class SubInterface2["SubInterface2"]
  class SubInterface3["SubInterface3"]
  class _Module_Tags_yaml["Tags"]
}
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
}
_Module2_Object2_yaml o-- _Module_Object_yaml :reference1
_Module2_Object2_yaml ..> _Module_Object_yaml :reference2
_Module_Interface_yml <|-- Interface1 
_Module_Interface_yml <|-- Interface2 
_Module_Object_yaml o-- SubObject :subObject
_Module_Object_yaml o-- SubInterface :subInterface
SubInterface <|-- _Module_Object_yaml 
SubInterface <|-- SubInterface2 
SubInterface <|-- SubInterface3 
SubInterface3 <|-- _Module_Object_yaml 
SubInterface3 <|-- _Module_Interface_yml 
click _Module_Interface_yml href "./Interface.yml.html" "Interface"
click Interface1 href "./Interface.yml.html" "Interface"
click Interface2 href "./Interface.yml.html" "Interface"
click _Module_Object_yaml href "./Object.yaml.html" "Object"
click SubObject href "./Object.yaml.html" "Object"
click SubInterface href "./Object.yaml.html" "Object"
click SubInterface2 href "./Object.yaml.html" "Object"
click SubInterface3 href "./Object.yaml.html" "Object"
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
| WRONG | Schema &#x27;Tags&#x27; has 1 validation error |

## Links
1. [Link](http://www.google.com)
1. [Local-Link](./Module/index.yaml)
