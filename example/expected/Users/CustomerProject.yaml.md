# Customer Project
An customer project
```mermaid
classDiagram
namespace Users {
  class _Users_CustomerProject_yaml["Customer Project"]
  class _Users_Customer_yaml["Customer"]
  class _Users_Project_yaml["Project"]
  class CustomerProjects["CustomerProjects"]
}
_Users_Customer_yaml o--" N" _Users_CustomerProject_yaml :customerProjects
_Users_Project_yaml <|-- _Users_CustomerProject_yaml 
CustomerProjects ..> _Users_CustomerProject_yaml :projectId
click _Users_CustomerProject_yaml href "./CustomerProject.yaml.html" "Customer Project"
click _Users_Customer_yaml href "./Customer.yaml.html" "Customer"
click _Users_Project_yaml href "./Project.yaml.html" "Project"
click CustomerProjects href "./User.yaml.html" "User"
```




## Properties
| Name | Type | Description |
|------|------|-------------|
| projectId* | string | The id of the project |
| projectName* | string | The name of the project |
| projectDescription* | string | The description of the project |


## Links
1. [Java-File](./java/CustomerProject.java)
