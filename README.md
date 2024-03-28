# Domain-Schema-Documentation
<p align="right">
  <a href="https://github.com/lizzyTheLizard/domain-schema-documentation/issues">
    <img src="https://img.shields.io/github/issues/lizzyTheLizard/domain-schema-documentation" alt="Open Issues">
  </a>
  <a href="https://github.com/lizzyTheLizard/domain-schema-documentation/pulls">
    <img src="https://img.shields.io/github/issues-pr/lizzyTheLizard/domain-schema-documentation" alt="Open Pull Requests">
  </a>
  <a href="https://github.com/lizzyTheLizard/domain-schema-documentation/actions/workflows/build.yaml">
    <img src="https://img.shields.io/github/actions/workflow/status/lizzyTheLizard/domain-schema-documentation/build.yaml" alt="Workflow Status">
  </a>
  <a href="https://raw.githubusercontent.com/lizzyTheLizard/domain-schema-documentation/main/LICENSE">
    <img src="https://img.shields.io/github/license/lizzyTheLizard/domain-schema-documentation" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/domain-schema-documentation">
    <img src="https://img.shields.io/npm/v/domain-schema-documentation?color=green" alt="Version">
  </a>
</p>Generate Documentation from JSON Schema, generate stubs in Java and TypeScript and check existing implementations for compliance

## Key Features
From a domain model defined in JSON Schema, domain-schema-documentation can
* Generate HTML or Markdown documentation. This can easily be integrated into GitHub-Pages or similar to automatically document your domain model.
* Generate Java or TypeScript stubs as well as OpenAPI specifications. You can generate additional stubs using a plugin system.
* Check existing implementations for compliance with the domain model to ensure that the implementation is up-to-date with the domain model.

## How To Use
To use domain-schema-documentation, you have to create your own node.js project. This allows you to customize the documentation and stub generation to your needs. The projects need domain-model-documentation as a dependency
```bash
npm install domain-schema-documentation
```
and can then generate documentation using the following code

```javascript
import {run} from 'domain-schema-documentation'
run().catch(console.error)
````

This will generate an HTML documentation in the folder `./out` out of a domain model defined in `./schema` and a template defined in `./input` and can be further customized. Check the [Example](#example) for a full setup.

### Read the Input Model
By default, the input model is read from the folder `./input`. It consists of the following parts:
* A top level `index.yaml` file containing the Application Description. This file can contain the following fields (see also its [Json Schema](lib/src/reader/inputDefinition/_Application.yaml)):
  * `title`: The title of the application (required)
  * `description`: A description of the application (required)
  * `links`: A list of links to other parts of the documentation (optional)
  * `todos`: A list of todos that are still open in the domain model (optional)
* For each module a folder with an `index.yaml` file containing the Module Description. This file can contain the following fields (see also its [Json Schema](lib/src/reader/inputDefinition/_Module.yaml)):
  * `$id`: ID of the module, must be the name of the folder (required)
  * `title`: The title of the module (required)
  * `description`: A description of the module (required)
  * `links`: A list of links to other parts of the documentation (optional)
  * `todos`: A list of todos that are still open in the domain model (optional)
* For each type a JSON-Schema file containing the Type Description. The Schema-File must be in one of the module folders, and it's `$id` must be equal to the filename.

Each Schema must be a valid JSON Schema. You can add your own additional extensions, but they must be prefixed with `x-` to avoid conflicts. Additionally, the following restrictions must be fulfilled (see also its [Json Schema](lib/src/reader/inputDefinition/_Schema.yaml)):
* Each schema must define a `title` and an `$id`. The title must be a string.
* Schemas must be either an enum (`type: string` and have a property `enum`), an object (`type: object`), or an interface (`type: object` and have a `properties`) or an interface (`type: object` and have a list of `oneOf`). You cannot mix these types in one schema or have a basic type as top level schema.
* Each Schema must have an `x-schema-type` of  `Aggregate`, `Entity`, `ValueObject`, `ReferenceData`, or `Other`.
* A Schema can define `x-links`(a list of links to other parts of the documentation) and `x-todos` (a list of todos that are still open in the domain model).
* An enum schema can define a property `x-enum-description` documenting the enum values
* Each basic property can define a `x-references` property that contains a list of references to other types in the domain model. This is usefull, if you store an ID of another type in a property and want to describe the referenced type.
* The following JSON Schema Parts are not supported: `additionalProperties`, `additionalItems`, `maxProperties`, `minProperties`, `patternProperties`, `propertyNames`, `allOf`, and `anyOf`.
* For `type` and `enum` only string values are supported.
* 
A [DefaultReader](lib/src/reader/DefaultReader.ts) is included, but you can also define your own reader by implementing the [Reader](lib/src/reader/Reader.ts) interface. You can pass the reader to be included to the run function.
```javascript
run({ reader: defaultReader(inputDir)}).catch(console.error)
```
### Create Documentation
By default, an HTML documentation is generated in the folder `./out`. You can customize the output by passing one or multiple writers to the `run` function. A writer for [HTML](lib/src/writer/html/HtmlWriter.ts) and [Markdown](lib/src/writer/markdown/MarkdownWriter.ts) is included, but they can be configured (e.g. using different Handlebar-Templates) and you can also define your own writer by implementing the [Writer](lib/src/writer/Writer.ts) interface. You can pass the list of writers to be included to the `run` function.
```javascript
run({ writers: [markdownWriter(outputDir)]}).catch(console.error)
```

### Plugins
Plugins can 
* Update and change the read domain model
* Generate stubs in different languages
* Check existing implementations for compliance with the domain model

A plugin for [Java](lib/src/plugin/java/JavaPlugin.ts) and [OpenAPI](lib/src/plugin/openapi/OpenApiPlugin.ts) is included, but you can also define your own plugin by implementing the [Plugin](lib/src/plugin/Plugin.ts) interface. You can pass the list of plugins to be included to the `run` function.
```javascript
run({ plugins: [openApiPlugin(outputDir)]}).catch(console.error)
```

## Example
In the folder [example](example) you can find a full example of how to use this package. The example contains a domain model defined in JSON Schema in the folder [input](example/input), a configuration script at [main.ts](example/main.ts) and a [package.json](example/package.json) file defing the script `generate` to run the example. In will generate HTML and Markdown documentation in the folder [out](example/out) as well as Java and TypeScript stubs. The documentation is automatically published to [GitHub Pages](https://lizzythelizard.github.io/domain-schema-documentation/) using the GitHub Action defined in [.github/workflows/build.yaml](.github/workflows/build.yaml).

## Credits
This software uses the following open source packages:
- [Handlebars Template Engine](https://handlebarsjs.com/)
- [Ajv JSON Schema Validator](https://ajv.js.org/)
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

## License
[MIT](LICENSE)