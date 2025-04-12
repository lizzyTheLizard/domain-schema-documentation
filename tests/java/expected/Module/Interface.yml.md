# Interface
![Static Badge](https://img.shields.io/badge/Validator%20Errors-1-red)


An interface
```mermaid
classDiagram
namespace Module {
  class _Module_Interface_yml["Interface"]
  class OneOf2["OneOf2"]
  class OneOf1["OneOf1"]
  class SubInterfaceOneOf3["SubInterfaceOneOf3"]
}
SubInterfaceOneOf3 <|-- _Module_Interface_yml 
_Module_Interface_yml <|-- OneOf1 
_Module_Interface_yml <|-- OneOf2 
click _Module_Interface_yml href "./Interface.yml.html" "Interface"
click OneOf2 href "./Interface.yml.html" "Interface"
click OneOf1 href "./Interface.yml.html" "Interface"
click SubInterfaceOneOf3 href "./Object.yaml.html" "Object"
```

## One Of
1. [OneOf1](#OneOf1)
1. [OneOf2](#OneOf2)


## Properties
| Property | Type | Description |
|------|------|-------------|
| kind* | String |  |



## Subschemas
### Class OneOf2


| Property | Type | Description |
|------|------|-------------|
| kind* | String<br>"INSIDE2" |  |
| key | String |  |
| value | String |  |
| (other) | Integer | Additional Properties |

### Class OneOf1


| Property | Type | Description |
|------|------|-------------|
| kind* | String<br>"INSIDE1" |  |
| name | String |  |


## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | Interface &#x27;com.example.module.model.Interface&#x27; is invalid: This is suppose to be an interface but is a &#x27;class&#x27; |

## Links
1. [Java-File](./java/Interface.java)
1. [Java-File (OneOf2)](./java/InterfaceOneOf2.java)
1. [Java-File (OneOf1)](./java/InterfaceOneOf1.java)
