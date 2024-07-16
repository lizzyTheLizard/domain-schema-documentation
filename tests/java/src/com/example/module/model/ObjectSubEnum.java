package com.example.module.model;

public enum ObjectSubEnum {
  // Everything except the constant name should be ignored
  A (5) {
    @Override
    public boolean isOrdered() {
        return true;
    }
  },
  B(2) {
    @Override
    public boolean isOrdered() {
        return true;
    }
  };

  // Fields are not relevant and are ignored
  private final int example;

  //Methods are ignored anyway
  public boolean isOrdered() {return false;}

  ObjectSubEnum (int example) {
      this.example = example;
  }

}
