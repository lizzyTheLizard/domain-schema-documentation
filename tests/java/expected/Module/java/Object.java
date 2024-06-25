package com.example.module.model;

import lombok.*;

// This is an integration test for the application
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Object implements Interface {
  private String id;
  private String name;
}


