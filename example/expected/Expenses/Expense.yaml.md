# Expense
An expense
```mermaid
classDiagram
namespace Expenses {
  class _Expenses_Expense_yaml["Expense"]
  class _Expenses_ExpenseStatus_yaml["Expense Status"]
  class _Expenses_ExpenseJournal_yaml["Expense Journal Entry"]
}
namespace Users {
  class _Users_User_yaml["User"]
  class _Users_Project_yaml["Project"]
}
_Expenses_Expense_yaml ..> _Users_User_yaml :userId
_Expenses_Expense_yaml ..> _Users_Project_yaml :costCenter
_Expenses_Expense_yaml o--" N" _Expenses_ExpenseJournal_yaml :journal
click _Expenses_Expense_yaml href "./Expense.yaml.html" "Expense"
click _Users_User_yaml href "./../Users/User.yaml.html" "User"
click _Users_Project_yaml href "./../Users/Project.yaml.html" "Project"
click _Expenses_ExpenseStatus_yaml href "./ExpenseStatus.yaml.html" "Expense Status"
click _Expenses_ExpenseJournal_yaml href "./ExpenseJournal.yaml.html" "Expense Journal Entry"
```

## Properties
| Name | Type | Description |
|------|------|-------------|
| id | string | The unique identifier of the expense |
| date | date | The date of the expense |
| amount | float | The amount of the expense |
| currency | string | The currency of the expense |
| description | string | The description of the expense |
| userId | References [User](./../Users/User.yaml.md) | The user who created the expense |
| costCenter | References [Project](./../Users/Project.yaml.md) | The cost center of the expense |
| status | [Expense Status](./ExpenseStatus.yaml.md) |  |
| journal | [[Expense Journal Entry](./ExpenseJournal.yaml.md)] | The journal of the expense |

## Examples
```json
{
  "id": "exp123",
  "date": "2023-10-01",
  "amount": 200.5,
  "currency": "USD",
  "description": "Office Supplies",
  "userId": "user456",
  "costCenter": "CC789",
  "status": "Submitted",
  "journal": [
    {
      "id": "jrn1",
      "date": "2023-10-01",
      "newStatus": "Submitted",
      "userId": "user456",
      "comment": "Initial submission"
    }
  ]
}
```

## Links
1. [Java-File](./java/Expense.java)
