package com.example.module.model;

import lombok.*;
import java.util.Map;

// A simple object
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object implements ObjectSubInterface, ObjectSubInterfaceOneOf3 {
  private String id;
  private String name;
  private Map<String, Float> intMap;
  private Map<String, ObjectObjectMapAdditionalProperties> objectMap;
  private ObjectSubObject subObject;
  private ObjectSubEnum subEnum;
  private ObjectSubInterface subInterface;
  private Map<String, Integer> additionalProperties;
}


