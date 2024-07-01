package com.example.module.model;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public record InterfaceOtherObject(String id, int wrongType, Integer wrongProperty) implements Interface {
}


