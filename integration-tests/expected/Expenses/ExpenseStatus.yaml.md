# Expense Status
The status of an expense
```mermaid
classDiagram
namespace Expenses {
  class _Expenses_ExpenseStatus_yaml["Expense Status"]
  class _Expenses_Expense_yaml["Expense"]
  class _Expenses_ExpenseJournal_yaml["Expense Journal Entry"]
}
click _Expenses_ExpenseStatus_yaml href "./ExpenseStatus.yaml.html" "Expense Status"
click _Expenses_Expense_yaml href "./Expense.yaml.html" "Expense"
click _Expenses_ExpenseJournal_yaml href "./ExpenseJournal.yaml.html" "Expense Journal Entry"
```

## Enum-Values
| Name | Description |
|------|-------------|
| Draft | The expense has been created but not yet submitted |
| Submitted | The expense has been submitted for approval |
| Approved | The expense has been approved |
| Rejected | The expense has been rejected |
| Paid | The expense has been paid |

## Links
1. [Java-File](./java/ExpenseStatus.java)
