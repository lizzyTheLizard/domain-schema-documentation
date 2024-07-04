package com.example.module2.model;

import lombok.*;

// An Object in Module 2
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object2 {
  private String id;
  private Object2Type type;
}


