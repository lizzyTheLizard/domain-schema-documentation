package com.example.module.model;

import lombok.*;
import java.util.Map;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InterfaceInterface2 implements Interface {
  private final static String kind = "INSIDE2";
  private String key;
  private String value;
  private Map<String, Integer> additionalProperties;
}


