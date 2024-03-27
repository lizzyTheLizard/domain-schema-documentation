# User
An user of the system
```mermaid
classDiagram
namespace Users {
  class _Users_User_yaml["User"]
  class CustomerProjects["CustomerProjects"]
  class RoleInProject["RoleInProject"]
  class Role["Role"]
  class _Users_CustomerProject_yaml["Customer Project"]
}
namespace Expenses {
  class _Expenses_Expense_yaml["Expense"]
  class _Expenses_ExpenseJournal_yaml["Expense Journal Entry"]
}
_Expenses_Expense_yaml ..> _Users_User_yaml :userId
_Expenses_ExpenseJournal_yaml ..> _Users_User_yaml :userId
_Users_User_yaml o--" N" CustomerProjects :customerProjects
CustomerProjects ..> _Users_CustomerProject_yaml :projectId
click _Users_User_yaml href "./User.yaml.html" "User"
click CustomerProjects href "./User.yaml.html" "User"
click RoleInProject href "./User.yaml.html" "User"
click Role href "./User.yaml.html" "User"
click _Expenses_Expense_yaml href "./../Expenses/Expense.yaml.html" "Expense"
click _Expenses_ExpenseJournal_yaml href "./../Expenses/ExpenseJournal.yaml.html" "Expense Journal Entry"
click _Users_CustomerProject_yaml href "./CustomerProject.yaml.html" "Customer Project"
```

## Properties
| Name | Type | Description |
|------|------|-------------|
| firstName* | string | The first name of the user |
| lastName* | string | The last name of the user |
| email* | email | The email of the user |
| customerProjects | [[CustomerProjects](#CustomerProjects)] |  |
| role | [[Role](#Role)] |  |

## Subschemas
### CustomerProjects (Object)


| Name | Type | Description |
|------|------|-------------|
| projectId | References [Customer Project](./CustomerProject.yaml.md) | The id of the project |
| roleInProject | [[RoleInProject](#RoleInProject)] |  |
### RoleInProject (Enum)


| Name | Description |
|------|-------------|
| admin | Administrator of the project |
| member | Regular member of the project |
| leader | Project-leader, can accept expenses |
### Role (Enum)


| Name | Description |
|------|-------------|
| admin | Administrator |
| user | Regular user |
| finance | Employee in the finance department |

## Examples
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "customerProjects": [
    {
      "projectId": "1",
      "roleInProject": [
        "admin"
      ]
    },
    {
      "projectId": "2",
      "roleInProject": [
        "member"
      ]
    }
  ],
  "role": [
    "admin"
  ]
}
```

## Links
1. [Java-File](./java/User.java)
