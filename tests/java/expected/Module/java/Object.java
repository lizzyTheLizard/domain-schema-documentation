package com.example.module.model;

import lombok.*;
import java.util.Collection;
import com.example.module2.model.Object2;

// This is an integration test for the application
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object implements Interface {
  private Collection<String> ids;
  private String name;
  private Object2 obj2;
}


