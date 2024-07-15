# Object

This is an integration test for the application
```mermaid
classDiagram
namespace Module {
  class _Module_Object_yaml["Object"]
  class _Module_Interface_yaml["Interface"]
}
namespace Module 2 {
  class _Module2_Object2_yaml["Object 2"]
}
_Module_Interface_yaml <|-- _Module_Object_yaml 
_Module_Object_yaml ..> _Module2_Object2_yaml :obj2
click _Module_Object_yaml href "./Object.yaml.html" "Object"
click _Module_Interface_yaml href "./Interface.yaml.html" "Interface"
click _Module2_Object2_yaml href "../Module2/Object2.yaml.html" "Object 2"
```

## Examples
```json
{
  "ids": [
    "1",
    "2"
  ],
  "name": "Test",
  "other": "False"
}
```



## Properties
| Name | Type | Description |
|------|------|-------------|
| ids | [String] |  |
| name | String |  |
| obj2 | [Object 2](../Module2/Object2.yaml.md) |  |
| (other) | * | Additional Properties |



## Links
1. [Java-File](./java/Object.java)
