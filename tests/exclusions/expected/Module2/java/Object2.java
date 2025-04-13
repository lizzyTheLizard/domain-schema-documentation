package com.example.module2.model;

import lombok.*;
import com.example.module.model.Object;
import java.util.UUID;
import java.util.Map;

// An Object in Module 2
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object2 {
  private String id;
  private Object2Type type;
  private Object reference1;
  private UUID reference2;
  private Object reference3;
  private Object reference4;
  private Map<String, Object2AdditionalProperties> additionalProperties;
}


