# Object


A simple object
```mermaid
classDiagram
namespace Module {
  class _Module_Object_yaml["Object"]
  class SubObject["SubObject"]
  class SubEnum["SubEnum"]
  class SubInterface["SubInterface"]
  class SubInterface2["SubInterface2"]
  class SubInterface3["SubInterface3"]
  class _Module_Interface_yml["Interface"]
}
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
}
_Module2_Object2_yaml o-- _Module_Object_yaml :reference1
_Module2_Object2_yaml ..> _Module_Object_yaml :reference2
_Module_Object_yaml o-- SubObject :subObject
_Module_Object_yaml ..> SubEnum :subEnum
_Module_Object_yaml o-- SubInterface :subInterface
SubInterface <|-- _Module_Object_yaml 
SubInterface <|-- SubInterface2 
SubInterface <|-- SubInterface3 
SubInterface3 <|-- _Module_Object_yaml 
SubInterface3 <|-- _Module_Interface_yml 
click _Module_Object_yaml href "./Object.yaml.html" "Object"
click SubObject href "./Object.yaml.html" "Object"
click SubEnum href "./Object.yaml.html" "Object"
click SubInterface href "./Object.yaml.html" "Object"
click SubInterface2 href "./Object.yaml.html" "Object"
click SubInterface3 href "./Object.yaml.html" "Object"
click _Module2_Object2_yaml href "../Module2/Object2.yaml.html" "Object 2"
click _Module_Interface_yml href "./Interface.yml.html" "Interface"
```



## Properties
| Property | Type | Description |
|------|------|-------------|
| id* | String |  |
| name* | String |  |
| subObject | [SubObject](#SubObject) |  |
| subEnum | [SubEnum](#SubEnum) |  |
| subInterface | [SubInterface](#SubInterface) |  |

## Examples
```json
{
  "id": "1",
  "name": "Test"
}
```


## Subschemas
### Class SubObject


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

### Enum SubEnum

| Enum | Description |
|------|-------------|
| A | Value A |
| B | Value B |


### Interface SubInterface


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

Implemented by
1. [Object](./)
1. [SubInterface2](#SubInterface2)
1. [SubInterface3](#SubInterface3)
### Class SubInterface2


| Property | Type | Description |
|------|------|-------------|
| key | String |  |
| value | String |  |

### Interface SubInterface3



Implemented by
1. [Object](./)
1. [Interface](./Interface.yml.md)


