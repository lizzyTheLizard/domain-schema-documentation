package com.example.expenses.model;

import java.time.LocalDate;

// An changed that was made to an expense
public class ExpenseJournal {
  // The unique identifier of the expense
  private String id;
  // The date of the expense
  private LocalDate date;
  private ExpenseStatus newStatus;
  // The user who changed the expense
  private String userId;
  // Description of the change
  private String comment;
}


