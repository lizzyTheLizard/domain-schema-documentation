package com.example.module.model;

import lombok.*;
import java.util.Map;

// A simple object
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object implements Object, Object {
  private String id;
  private String name;
  private ObjectSubObject subObject;
  private ObjectSubEnum subEnum;
  private ObjectSubInterface subInterface;
  private Map<String, Integer> additionalProperties;
}


