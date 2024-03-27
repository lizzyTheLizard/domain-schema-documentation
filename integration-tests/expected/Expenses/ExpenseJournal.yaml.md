# Expense Journal Entry
An changed that was made to an expense
```mermaid
classDiagram
namespace Expenses {
  class _Expenses_ExpenseJournal_yaml["Expense Journal Entry"]
  class _Expenses_Expense_yaml["Expense"]
  class _Expenses_ExpenseStatus_yaml["Expense Status"]
}
namespace Users {
  class _Users_User_yaml["User"]
}
_Expenses_Expense_yaml o--" N" _Expenses_ExpenseJournal_yaml :journal
_Expenses_ExpenseJournal_yaml ..> _Users_User_yaml :userId
click _Expenses_ExpenseJournal_yaml href "./ExpenseJournal.yaml.html" "Expense Journal Entry"
click _Expenses_Expense_yaml href "./Expense.yaml.html" "Expense"
click _Expenses_ExpenseStatus_yaml href "./ExpenseStatus.yaml.html" "Expense Status"
click _Users_User_yaml href "./../Users/User.yaml.html" "User"
```

## Properties
| Name | Type | Description |
|------|------|-------------|
| id* | string | The unique identifier of the expense |
| date* | date | The date of the expense |
| newStatus* | [Expense Status](./ExpenseStatus.yaml.md) |  |
| userId* | References [User](./../Users/User.yaml.md) | The user who changed the expense |
| comment | string | Description of the change |

## Links
1. [Java-File](./java/ExpenseJournal.java)
