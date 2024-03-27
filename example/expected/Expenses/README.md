# Expenses
The Expenses

## Schemas
```mermaid
classDiagram
namespace Expenses {
  class _Expenses_Expense_yaml["Expense"]
  class _Expenses_ExpenseJournal_yaml["Expense Journal Entry"]
  class _Expenses_ExpenseStatus_yaml["Expense Status"]
}
namespace Users {
  class _Users_User_yaml["User"]
  class _Users_Project_yaml["Project"]
}
_Expenses_Expense_yaml ..> _Users_User_yaml :userId
_Expenses_Expense_yaml ..> _Users_Project_yaml :costCenter
_Expenses_Expense_yaml o--" N" _Expenses_ExpenseJournal_yaml :journal
_Expenses_ExpenseJournal_yaml ..> _Users_User_yaml :userId
click _Expenses_Expense_yaml href "./Expense.yaml.html" "Expense"
click _Expenses_ExpenseJournal_yaml href "./ExpenseJournal.yaml.html" "Expense Journal Entry"
click _Expenses_ExpenseStatus_yaml href "./ExpenseStatus.yaml.html" "Expense Status"
click _Users_User_yaml href "./../Users/User.yaml.html" "User"
click _Users_Project_yaml href "./../Users/Project.yaml.html" "Project"
```
| Name | Type | Description |
|------|-----|-------------|
| [Expense](./Expense.yaml.md) | Aggregate | An expense |
| [Expense Journal Entry](./ExpenseJournal.yaml.md) | Entity | An changed that was made to an expense |
| [Expense Status](./ExpenseStatus.yaml.md) | ValueObject | The status of an expense |

## Links
1. [OpenApiSpec](./Expenses.openapi.yaml)
1. [Java-Files](./java)
