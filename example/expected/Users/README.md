# Users
The Users of the system and their projects

## Schemas
```mermaid
classDiagram
namespace Users {
  class _Users_Customer_yaml["Customer"]
  class _Users_CustomerProject_yaml["Customer Project"]
  class _Users_InternalProject_yaml["Internal Project"]
  class _Users_Project_yaml["Project"]
  class _Users_User_yaml["User"]
  class CustomerProjects["CustomerProjects"]
  class RoleInProject["RoleInProject"]
  class Role["Role"]
}
namespace Expenses {
  class _Expenses_Expense_yaml["Expense"]
  class _Expenses_ExpenseJournal_yaml["Expense Journal Entry"]
}
_Expenses_Expense_yaml ..> _Users_User_yaml :userId
_Expenses_Expense_yaml ..> _Users_Project_yaml :costCenter
_Expenses_ExpenseJournal_yaml ..> _Users_User_yaml :userId
_Users_Customer_yaml o--" N" _Users_CustomerProject_yaml :customerProjects
_Users_Project_yaml <|-- _Users_InternalProject_yaml 
_Users_Project_yaml <|-- _Users_CustomerProject_yaml 
_Users_User_yaml o--" N" CustomerProjects :customerProjects
CustomerProjects ..> _Users_CustomerProject_yaml :projectId
click _Users_Customer_yaml href "./Customer.yaml.html" "Customer"
click _Users_CustomerProject_yaml href "./CustomerProject.yaml.html" "Customer Project"
click _Users_InternalProject_yaml href "./InternalProject.yaml.html" "Internal Project"
click _Users_Project_yaml href "./Project.yaml.html" "Project"
click _Users_User_yaml href "./User.yaml.html" "User"
click CustomerProjects href "./User.yaml.html" "User"
click RoleInProject href "./User.yaml.html" "User"
click Role href "./User.yaml.html" "User"
click _Expenses_Expense_yaml href "./../Expenses/Expense.yaml.html" "Expense"
click _Expenses_ExpenseJournal_yaml href "./../Expenses/ExpenseJournal.yaml.html" "Expense Journal Entry"
```
| Name | Type | Description |
|------|-----|-------------|
| [Customer](./Customer.yaml.md) | Aggregate | A customer |
| [Customer Project](./CustomerProject.yaml.md) | Entity | An customer project |
| [Internal Project](./InternalProject.yaml.md) | ReferenceData | An internal project |
| [Project](./Project.yaml.md) | Other | A project |
| [User](./User.yaml.md) | Aggregate | An user of the system |

## Links
1. [OpenApiSpec](./Users.openapi.yaml)
1. [Java-Files](./java)
