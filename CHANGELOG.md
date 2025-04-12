# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added x-reference-type property to define the type of the reference
- Static properties are ignored in java validation
- Added exclusion on application level

### Changed

### Deprecated

### Removed

### Fixed

## [1.11.0] - 2024-12-10
### Added
- Added configuration option to disable clickable diagrams in markdown
- Added configuration option to disable prefixing schema names in open api
- Added configuration option to ignore certain properties in open api

## [1.10.0] - 2024-09-26
### Added
- Support for Java-Classes in Sub-Packages
- Less verbose openapi diff output

## [1.9.4] - 2024-08-23
### Fixed
- Fixed problem with additional properties in interfaces

## [1.9.3] - 2024-08-23
### Fixed
- Ignore husky when installing as a dependency

## [1.9.2] - 2024-08-23
### Fixed
- Fixed bug when generating type names: Wrong commas were introduced into the type name (e.g. Date,Time instead of DateTime)

## [1.9.1] - 2024-08-07
### Fixed
- Fixed example project, no impact on library

## [1.9.0] - 2024-08-07
### Added
- Integrated Husky for pre-commit hooks incl. new check for version in package.json
- Added ChangeLog file

### Changed
- Updated all dependencies
- Migrated to eslint9 and stylistic
