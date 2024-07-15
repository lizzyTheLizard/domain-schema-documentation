# Module 2
![Static Badge](https://img.shields.io/badge/Validator%20Errors-1-red)

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
_Module_Object_yaml ..> _Module2_Object2_yaml :obj2
_Module2_Object2_yaml o-- AdditionalProperties 
click _Module2_Object2_yaml href "./Object2.yaml.html" "Object 2"
click AdditionalProperties href "./Object2.yaml.html" "Object 2"
click _Module_Object_yaml href "../Module/Object.yaml.html" "Object"
```
| Name | Type | Description |
|------|-----|-------------|
| [Object 2](./Object2.yaml.md) | Other | An Object in Module 2 |

## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | Schema &#x27;Object 2&#x27; has 3 validation errors |

## Links
1. [Java-Files](./java)
