# Internal Project
An internal project
```mermaid
classDiagram
namespace Users {
  class _Users_InternalProject_yaml["Internal Project"]
  class _Users_Project_yaml["Project"]
}
_Users_Project_yaml <|-- _Users_InternalProject_yaml 
click _Users_InternalProject_yaml href "./InternalProject.yaml.html" "Internal Project"
click _Users_Project_yaml href "./Project.yaml.html" "Project"
```

## Examples
```json
{
  "projectId": "1",
  "projectName": "Project 1",
  "projectDescription": "Description of project 1"
}
```



## Properties
| Name | Type | Description |
|------|------|-------------|
| projectId | string | The id of the project |
| projectName | string | The name of the project |
| projectDescription | string | The description of the project |


## Links
1. [Java-File](./java/InternalProject.java)
