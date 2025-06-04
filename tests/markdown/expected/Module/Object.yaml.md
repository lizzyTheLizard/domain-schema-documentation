# Object


A simple object
```mermaid
classDiagram
namespace Module {
  class _Module_Object_yaml["Object"]
  class SubInterface["SubInterface"]
  class SubInterfaceOneOf3["SubInterfaceOneOf3"]
  class SubInterfaceOneOf2["SubInterfaceOneOf2"]
  class SubEnum["SubEnum"]
  class SubObject["SubObject"]
  class ObjectMapAdditionalProperties["ObjectMapAdditionalProperties"]
  class _Module_Interface_yml["Interface"]
}
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
}
_Module2_Object2_yaml o-- _Module_Object_yaml :reference1
_Module2_Object2_yaml ..> _Module_Object_yaml :reference2
_Module2_Object2_yaml *-- _Module_Object_yaml :reference3
_Module2_Object2_yaml --> _Module_Object_yaml :reference4
_Module_Object_yaml o--" N" ObjectMapAdditionalProperties :objectMap
_Module_Object_yaml o-- SubObject :subObject
_Module_Object_yaml ..> SubEnum :subEnum
_Module_Object_yaml o-- SubInterface :subInterface
SubInterface <|-- _Module_Object_yaml 
SubInterface <|-- SubInterfaceOneOf2 
SubInterface <|-- SubInterfaceOneOf3 
SubInterfaceOneOf3 <|-- _Module_Object_yaml 
SubInterfaceOneOf3 <|-- _Module_Interface_yml 
click _Module_Object_yaml href "./Object.yaml.html" "Object"
click SubInterface href "./Object.yaml.html" "Object"
click SubInterfaceOneOf3 href "./Object.yaml.html" "Object"
click SubInterfaceOneOf2 href "./Object.yaml.html" "Object"
click SubEnum href "./Object.yaml.html" "Object"
click SubObject href "./Object.yaml.html" "Object"
click ObjectMapAdditionalProperties href "./Object.yaml.html" "Object"
click _Module2_Object2_yaml href "../Module2/Object2.yaml.html" "Object 2"
click _Module_Interface_yml href "./Interface.yml.html" "Interface"
```



## Properties
| Property | Type | Description |
|------|------|-------------|
| id* | String |  |
| name* | String |  |
| intMap | {Float} |  |
| objectMap | {[ObjectMapAdditionalProperties](#ObjectMapAdditionalProperties)} |  |
| subObject | [SubObject](#SubObject) |  |
| subEnum | [SubEnum](#SubEnum) |  |
| subInterface | [SubInterface](#SubInterface) |  |
| (other) | Integer | Additional Properties |

## Examples
```json
{
  "id": "1",
  "name": "Test"
}
```


## Subschemas
### Interface SubInterface


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

Implemented by
1. [Object](./)
1. [SubInterfaceOneOf2](#SubInterfaceOneOf2)
1. [SubInterfaceOneOf3](#SubInterfaceOneOf3)
### Interface SubInterfaceOneOf3



Implemented by
1. [Object](./)
1. [Interface](./Interface.yml.md)
### Class SubInterfaceOneOf2


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

### Enum SubEnum

| Enum | Description |
|------|-------------|
| A | Value A |
| B | Value B |


### Class SubObject


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

### Class ObjectMapAdditionalProperties


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |



