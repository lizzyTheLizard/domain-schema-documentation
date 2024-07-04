package com.example.module.model;

import lombok.*;

public record InterfaceOtherObject(String id, int wrongType, Integer wrongProperty) implements Interface {
}


