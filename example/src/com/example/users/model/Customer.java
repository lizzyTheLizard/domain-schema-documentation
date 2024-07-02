package com.example.users.model;

import lombok.*;
import java.util.Collection;

// A customer
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Customer {
  // The id of the customer
  private String customerId;
  // The name of the customer
  private String customerName;
  private java.util.Collection<CustomerProject> customerProjects;
  // The contact person of the customer
  private String customerContact;
  // The email of the customer
  private String customerEmail;
}


