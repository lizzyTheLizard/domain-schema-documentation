package com.example.module.model;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InterfaceOtherObject implements Interface {
  private String id;
  private String name;
}


