package com.example.module.model;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InterfaceInterface1 implements Interface {
  private final static String kind = "INSIDE1";
  private String name;
}


