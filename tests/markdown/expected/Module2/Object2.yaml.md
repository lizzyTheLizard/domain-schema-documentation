# Object 2


An Object in Module 2
```mermaid
classDiagram
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
  class AdditionalProperties["AdditionalProperties"]
  class Type["Type"]
}
namespace Module {
  class _Module_Object_yaml["Object"]
}
_Module2_Object2_yaml ..> Type :type
_Module2_Object2_yaml o-- _Module_Object_yaml :reference1
_Module2_Object2_yaml ..> _Module_Object_yaml :reference2
_Module2_Object2_yaml *-- _Module_Object_yaml :reference3
_Module2_Object2_yaml --> _Module_Object_yaml :reference4
_Module2_Object2_yaml o--" N" AdditionalProperties 
click _Module2_Object2_yaml href "./Object2.yaml.html" "Object 2"
click AdditionalProperties href "./Object2.yaml.html" "Object 2"
click Type href "./Object2.yaml.html" "Object 2"
click _Module_Object_yaml href "../Module/Object.yaml.html" "Object"
```



## Properties
| Property | Type | Description |
|------|------|-------------|
| id | String |  |
| type | [Type](#Type) |  |
| reference1 | [Object](../Module/Object.yaml.md) |  |
| reference2 | References [Object](../Module/Object.yaml.md) |  |
| reference3 | [Object](../Module/Object.yaml.md) |  |
| reference4 | [Object](../Module/Object.yaml.md) |  |
| (other) | [AdditionalProperties](#AdditionalProperties) | Additional Properties |

## Examples
```json
{
  "id": "1",
  "type": "type1",
  "additional": {
    "key": "key",
    "value": "value"
  }
}
```


## Subschemas
### Class AdditionalProperties


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

### Enum Type

| Enum | Description |
|------|-------------|
| type1 | Description of type1 |
| type2 | Description of type2 |




