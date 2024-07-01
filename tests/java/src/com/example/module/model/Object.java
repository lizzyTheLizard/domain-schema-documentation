package com.example.module.model;

import lombok.*;

// This is an integration test for the application
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object implements Interface {
  private String[] ids;
  private String name;

  //Addtitional functions are ignored
  public void doSomething() {
    System.out.println("Doing something");
  }
}


