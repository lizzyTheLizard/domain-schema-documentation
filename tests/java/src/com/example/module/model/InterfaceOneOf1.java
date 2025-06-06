package com.example.module.model;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InterfaceOneOf1 extends Interface {
  private final static String kind = "INSIDE1";
  private String name;
}


