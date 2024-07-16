# Interface


An interface
```mermaid
classDiagram
namespace Module {
  class _Module_Interface_yml["Interface"]
  class Interface1["Interface1"]
  class Interface2["Interface2"]
  class SubInterface3["SubInterface3"]
}
SubInterface3 <|-- _Module_Interface_yml 
_Module_Interface_yml <|-- Interface1 
_Module_Interface_yml <|-- Interface2 
click _Module_Interface_yml href "./Interface.yml.html" "Interface"
click Interface1 href "./Interface.yml.html" "Interface"
click Interface2 href "./Interface.yml.html" "Interface"
click SubInterface3 href "./Object.yaml.html" "Object"
```

## One Of
1. [Interface1](#Interface1)
1. [Interface2](#Interface2)


## Properties
| Name | Type | Description |
|------|------|-------------|
| kind* | String |  |



## Subschemas
### Interface1




#### Properties
| Name | Type | Description |
|------|------|-------------|
| kind* | String<br>"INSIDE1" |  |
| name | String |  |
### Interface2




#### Properties
| Name | Type | Description |
|------|------|-------------|
| kind* | String<br>"INSIDE2" |  |
| key | String |  |
| value | String |  |


