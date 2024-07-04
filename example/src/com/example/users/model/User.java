package com.example.users.model;

import lombok.*;
import java.util.List;
import java.util.Set;

// An user of the system
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {
  // The first name of the user
  private String firstName;
  // The last name of the user
  private String lastName;
  // The email of the user
  private String email;
  private List<UserCustomerProjects> customerProjects;
  private Set<UserRole> role;
}


