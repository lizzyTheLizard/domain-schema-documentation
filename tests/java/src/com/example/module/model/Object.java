package com.example.module.model;

import lombok.*;
import java.util.Map;

public class Object implements Interface {
  private String id;
  private String name;
  private Map<String, Float> intMap;
  private Map<String, ObjectObjectMapAdditionalProperties> objectMap;
  private ObjectSubObject subObject;
  private ObjectSubEnum subEnum;
  private ObjectSubInterface subInterface;
  private java.util.Map<String, Integer> additionalProperties;

  //Addtitional functions are ignored
  public void doSomething() {
    System.out.println("Doing something");
  }
}


