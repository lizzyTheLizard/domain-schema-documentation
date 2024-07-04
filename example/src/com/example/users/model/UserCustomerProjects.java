package com.example.users.model;

import lombok.*;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserCustomerProjects {
  // The id of the project
  private String projectId;
  private UserRoleInProject[] roleInProject;
}


