package com.example.module.model;

import lombok.*;
import java.util.Collection;
import com.example.module2.model.Object2;

public class Object implements Interface {
  private Collection<String> ids;
  private String name;
  private Object2 obj2;

  //Addtitional functions are ignored
  public void doSomething() {
    System.out.println("Doing something");
  }
}


