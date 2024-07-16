# Module 2


This is a 2nd Module

## Schemas
```mermaid
classDiagram
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
  class AdditionalProperties["AdditionalProperties"]
}
namespace Module {
  class _Module_Object_yaml["Object"]
}
_Module2_Object2_yaml o-- _Module_Object_yaml :reference1
_Module2_Object2_yaml ..> _Module_Object_yaml :reference2
_Module2_Object2_yaml o--" N" AdditionalProperties 
click _Module2_Object2_yaml href "./Object2.yaml.html" "Object 2"
click AdditionalProperties href "./Object2.yaml.html" "Object 2"
click _Module_Object_yaml href "../Module/Object.yaml.html" "Object"
```
| Name | Type | Description |
|------|-----|-------------|
| [Object 2](./Object2.yaml.md) | Aggregate | An Object in Module 2 |


## Links
1. [Java-Files](./java)
