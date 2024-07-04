# Interface
> - [ ] 4 validation errors
This is an interface
```mermaid
classDiagram
namespace Module {
  class _Module_Interface_yaml["Interface"]
  class OtherObject["OtherObject"]
  class Interface3["Interface3"]
  class _Module_Object_yaml["Object"]
}
_Module_Interface_yaml <|-- _Module_Object_yaml 
_Module_Interface_yaml <|-- OtherObject 
_Module_Interface_yaml <|-- Interface3 
click _Module_Interface_yaml href "./Interface.yaml.html" "Interface"
click OtherObject href "./Interface.yaml.html" "Interface"
click Interface3 href "./Interface.yaml.html" "Interface"
click _Module_Object_yaml href "./Object.yaml.html" "Object"
```


## One Of
1. [Object](./Object.yaml.md)
1. [OtherObject](#OtherObject)
1. [Interface3](#Interface3)



## Subschemas
### OtherObject (Object)




| Name | Type | Description |
|------|------|-------------|
| id | string |  |
| wrongType | string |  |
### Interface3 (Enum)



| Name | Description |
|------|-------------|
| Test | Test description |
| Test2 | Test2 description |


## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | Interface &#x27;com.example.module.model.Interface&#x27; is invalid: This is suppose to be an interface but is a &#x27;class&#x27;&#x27; |
| WRONG | Property &#x27;wrongType&#x27; has type &#x27;Integer&#x27; in class &#x27;com.example.module.model.InterfaceOtherObject&#x27; but should have type &#x27;String&#x27; |
| NOT_IN_DOMAIN_MODEL | Property &#x27;wrongProperty&#x27; should not exist in class &#x27;com.example.module.model.InterfaceOtherObject&#x27; |
| NOT_IN_DOMAIN_MODEL | Value &#x27;Test3&#x27; should not exist in enum &#x27;com.example.module.model.InterfaceInterface3&#x27; |

## Links
1. [Java-File](./java/Interface.java)
1. [Java-File (OtherObject)](./java/InterfaceOtherObject.java)
1. [Java-File (Interface3)](./java/InterfaceInterface3.java)
