# Interface
![Static Badge](https://img.shields.io/badge/Validator%20Errors-1-red)


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

## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | Interface &#x27;com.example.module.model.Interface&#x27; is invalid: This is suppose to be an interface but is a &#x27;class&#x27;&#x27; |

## Links
1. [Java-File](./java/Interface.java)
1. [Java-File (Interface1)](./java/InterfaceInterface1.java)
1. [Java-File (Interface2)](./java/InterfaceInterface2.java)
