package com.example.expenses.model;

// The status of an expense
public enum ExpenseStatus {
  // The expense has been created but not yet submitted
  Draft = new ExpenseStatus(true, false, "Draft"),
  // The expense has been submitted for approval
  Submitted = new ExpenseStatus(true, true, "Submitted"),
  // The expense has been approved
  Approved = new ExpenseStatus(true, false, "Approved"),
  // The expense has been rejected
  Rejected = new ExpenseStatus(true, true, "Rejected"),
  // The expense has been paid
  Paid = new ExpenseStatus(false, false, "Paid"),
  Deleted = new ExpenseStatus(false, false, "Deleted");

  private final boolean showForUser;
  private final boolean showForManager;
  private final Label labelKey;

  public ExpenseStatus(boolean showForUser, boolean showForManager, String labelKey) {
    this.showForUser = showForUser;
    this.showForManager = showForManager;
    this.labelKey = labelKey;
  }
}
