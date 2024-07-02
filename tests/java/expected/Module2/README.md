# Module 2
> - [ ] 1 validation error
This is a 2nd Module

## Schemas
```mermaid
classDiagram
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
  class Type["Type"]
}
namespace Module {
  class _Module_Object_yaml["Object"]
}
_Module_Object_yaml ..> _Module2_Object2_yaml :obj2
click _Module2_Object2_yaml href "./Object2.yaml.html" "Object 2"
click Type href "./Object2.yaml.html" "Object 2"
click _Module_Object_yaml href "../Module/Object.yaml.html" "Object"
```
| Name | Type | Description |
|------|-----|-------------|
| [Object 2](./Object2.yaml.md) | Other | An Object in Module 2 |

## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | Schema &#x27;Object 2&#x27; has 2 validation errors |

## Links
1. [Java-Files](./java)
