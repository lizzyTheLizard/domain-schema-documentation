package com.example.users.model;

import lombok.*;

// An internal project
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InternalProject implements Project {
  // The id of the project
  private String projectId;
  // The name of the project
  private String projectName;
  // The description of the project
  private String projectDescription;
}


