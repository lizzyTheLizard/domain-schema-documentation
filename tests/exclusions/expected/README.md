# Test Application
![Static Badge](https://img.shields.io/badge/Color--Tag-Blue-blue)
![Static Badge](https://img.shields.io/badge/Without%20Value-green)
![Static Badge](https://img.shields.io/badge/Validator%20Errors-2-red)

> - A Todo

This is an integration test for the application

## Modules
```mermaid
classDiagram
class _Module["Module"]
class _Module2["Module 2"]
_Module2 ..> _Module
click _Module href "./Module/index.html" "Module"
click _Module2 href "./Module2/index.html" "Module 2"
```
| Name | Description |
|------|-------------|
| [Module](./Module/README.md) | This is an integration test for the application |
| [Module 2](./Module2/README.md) | This is a 2nd Module |

## Verification Errors
| Type | Description |
|------|-------------|
| WRONG | An error |
| WRONG | Module &#x27;Module&#x27; has 3 validation errors |

## Links
1. [Link](http://www.google.com)
1. [Local-Link](./Module/index.yaml)
