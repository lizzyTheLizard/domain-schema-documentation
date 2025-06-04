package com.example.module.model;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ObjectSubInterfaceOneOf2 implements ObjectSubInterface {
  private String key;
  private String value;
}


