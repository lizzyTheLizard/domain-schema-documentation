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
</p>

**domain-schema-documentation** can be used to document the domain schema of an application. The domain model must be defined as JSON Schema, and domain-schema-documentation can then
* Generate HTML or Markdown documentation. This can easily be integrated into GitHub-Pages or similar to automatically document your domain model.
* Generate Java or TypeScript stubs as well as OpenAPI specifications.
* Check existing implementations for compliance with the domain model to ensure that the implementation is up-to-date with the domain model.

domain-schema-documentation can easily be extended to support additional languages or formats.

## How To Use
domain-schema-documentation can either be used as a command line tool or as a node.js package. While the command line tool is easy to use, the node.js package allows for more customization.

### Command Line
To use it as command line tool, you have to install it globally and then run against the domain model definition:

```bash
npm install -g domain-schema-documentation
npx domain-schema-documentation --html --input ./schema --output ./out
```

`./schema` is you domain model (see [Define the Input Model](#define-the-input-model) on how to define it) and `./out` is where the documentation is generated. Check ```domain-schema-documentation --help``` to get a list of all available options. Check the [Examples](#examples) for a detailed setup.

### Node.js Package
To use domain-schema-documentation as a node.js package, you have to create your own node.js project and add domain-schema-documentation as a dependency. You can then generate documentation using the following code:

```bash
npm install domain-schema-documentation
```

```javascript
import { run, defaultReader, htmlWriter } from 'domain-schema-documentation'
import * as path from 'path'

run({ 
  reader: defaultReader('./schema'), 
  writers: [htmlWriter('./out')]
}).catch(console.error)
```

`./schema` is you domain model (see [Define the Input Model](#define-the-input-model) on how to define it) and `./out` is where the documentation is generated. Check [RunOptions](./lib/src/RunOptions.ts) for a list of all available options. Check the [Examples](#examples) for a detailed setup.

## Define the Input Model
By default, the input model is read from the folder `./input`. It consists of the following parts:
* A top level `index.yaml` file containing the **Application Description**. This file can contain the following fields (see also its [Json Schema Definition](./lib/src/reader/inputDefinition/_Application.yaml)):
  * The `title` of the application (required)
  * A `description` (required)
  * A list of `links` to other parts of the documentation (optional)
  * A list of `todos` that are still open in the domain model (optional)
* For each module in the application a folder with an `index.yaml` file containing the **Module Description**. This file can contain the following fields (see also its [Json Schema Definition](./lib/src/reader/inputDefinition/_Module.yaml)):
  * The `$id` of the module, must be the name of the folder (required)
  * The `title` of the module (required)
  * A `description` (required)
  * A list of `links` to other parts of the documentation (optional)
  * A list of `todos` that are still open in the domain model (optional)
* For each type a JSON-Schema file containing the **Type Description**. The Schema-File must be in one of the module folders, and it's `$id` must be equal the filename. Schemas must be valid JSON Schemas. You can add your own additional extensions, but to avoid conflicts, they must be prefixed with `x-`. Additionally, the following restrictions must be fulfilled (see also its [Json Schema Definition](./lib/src/reader/inputDefinition/_Schema.yaml)):
  * Each schema must define a `title` and an `$id`. The title must be a string.
  * Schemas must be either an enum (`type: string` and have a property `enum`), an object (`type: object` and have a property `properties`) or an interface (`type: object` and have a list of `oneOf`). You cannot mix these types in one schema or have a basic type as top level schema.
  * Each Schema must have an `x-schema-type` of  `Aggregate`, `Entity`, `ValueObject`, `ReferenceData`, or `Other`.
  * A Schema can define `x-links`(a list of links to other parts of the documentation) and `x-todos` (a list of todos that are still open in the domain model).
  * An enum schema can define a property `x-enum-description` documenting the enum values
  * Each basic property can define a `x-references` property that contains a list of references to other types in the domain model. This is usefull, if you store an ID of another type in a property and want to describe the referenced type.
  * The following JSON Schema Parts are not supported: `additionalItems`, `maxProperties`, `minProperties`, `patternProperties`, `propertyNames`, `allOf`, and `anyOf`.
  * For `type` and `enum` only string values are supported.

If you want to change how the model is read, you can define your own reader by implementing the [Reader](./lib/src/reader/Reader.ts) interface. You can pass the reader to be included to the run function.
```javascript
run({ reader: yourreader}).catch(console.error)
```

By default, the [DefaultReader](./lib/src/reader/DefaultReader.ts) is used.

## Writers
Writers are used to generate the documentation. An HTML and a Markdown writer is already included, but you can also define your own writers.
You can use multiple writers at the same time.

### HTML Writer
The HTML writer generates a documentation in HTML format. Internally, Handlebars is used to generate the HTML files. You can customize the output by passing your own Handlebar templates to the writer. See [HtmlWriterOptions](./lib/src/writer/html/HtmlWriterOptions.ts) for a list of all available options.

On the command line, use `--html` to enable the HTML writer. In the node.js package, you can use the [htmlWriter](./lib/src/writer/html/HtmlWriter.ts) function.
```javascript
run({ writers: [htmlWriter('./output', options)]}).catch(console.error)
```

### Markdown Writer
The markdown writer generates a documentation in Markdown format. Internally, Handlebars is used to generate the Markdown files. You can customize the output by passing your own Handlebar templates to the writer. See [MarkdownWriterOptions](lib/src/writer/markdown/MarkdownWriterOptions.ts) for a list of all available options.

On the command line, use `--md` to enable the Markdown writer. In the node.js package, you can use the [markdownWriter](./lib/src/writer/markdown/MarkdownWriter.ts) function.
```javascript
run({ writers: [htmlWriter('./output', options)]}).catch(console.error)
````

### Custom Writers
To create a custom writer, implement the [Writer](./lib/src/writer/Writer.ts) interface. You can then use this writer as following
```javascript
run({ writers: [yourWriter]}).catch(console.error)
````

## Plugins
Plugins can
* Update and change the read domain model
* Generate stubs in different languages
* Check existing implementations for compliance with the domain model

A plugin for Java and OpenAPI is already included, but you can also define your own plugins.
You can use multiple plugins at the same time.

### Java Plugin
The Java-Plugin can be added using
```javascript
run({ plugins: [javaPlugin('./out')]}).catch(console.error)
```

It will then do two things:
* For each schema it will generate a Java class in the folder `./out/java` that represents the schema. Those file will be linked into the generated documentation.
* If an implementation folder is configured, it will check the implementation against the domain model. It will check if all classes are present and if the properties are correct. If the implementation is not up-to-date, it will generate a list of errors that will be added to the documentation.

You can configure the Java Plugin by passing an [JavaPluginOptions](./lib/src/plugin/java/JavaPlugin.ts) object to the plugin. 
### OpenAPI Plugin
[comment]: # (TODO: Document Java Plugin when finished)
TBD
### Custom Plugins
You can define your own plugin by implementing the [Plugin](./lib/src/plugin/Plugin.ts) interface. You can then use this writer as following
```javascript
run({ plugins: [yourPlugin]}).catch(console.error)
```

## Examples
In the folder [example](./example) you can find a full example of how to use this package. The example contains a domain model defined in JSON Schema in the folder [input](./example/input), a configuration script at [main.js](./example/main.js) and a [package.json](./example/package.json) file defining the script `generate` to run the example. In will generate HTML and Markdown documentation in the folder [out](./example/out) as well as Java and TypeScript stubs. The documentation is automatically published to [GitHub Pages](https://lizzythelizard.github.io/domain-schema-documentation/) using the GitHub Action defined in [build.yaml](./.github/workflows/build.yaml).

## Development
The source code can be found in the [lib/src](./lib/src) folder. It is organized in the following parts: 
* The [plugin](./lib/src/plugin) folder contains the plugin definitions as well as the default plugins for Java and OpenAPI.
* The  [reader](./lib/src/reader) folder container the input model reader
* The [writer](./lib/src/writer) folder contains the writer definition as well as the default writers for HTML and Markdown
* The [Run.ts](./lib/src/Run.ts) file contains the main function to run the documentation generation, [RunOptions.ts](./lib/src/RunOptions.ts) contains the options for the run function.
* The [cli.js](./lib/src/cli.js) file contains the command line interface.
* The [index.ts](./lib/src/index.ts) file exports all functions and classes.

Besides the lib, there are also subfolders for the [example](./example) and the [tests](./tests)

The following commands can be handy during development:
* `yarn build` to build the project
* `yarn test` to run the tests
* `yarn lint` to lint the project
* `yarn check` to run all checks and tests in the project
* `yarn integration-tests` to run the integration tests
* `yarn unit-tests` to run the unit tests
* `yarn workspace example generate` to run the example
* `yarn workspace example generate:watch` to run the example in watch mode

The GitHub Action Pipeline at [.github/workflows/build.yaml](./.github/workflows/build.yaml) is used to run the tests and checks on every push. After a merge to main, a new version is build and published to NPM. Make sure to increase the version number before merging to main!

## Credits
This software uses the following open source packages:
- [Handlebars Template Engine](https://handlebarsjs.com/)
- [Ajv JSON Schema Validator](https://ajv.js.org/)
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests and documentation as appropriate.

If you encounter any issues, please let me know by opening an [issue](https://github.com/lizzyTheLizard/domain-schema-documentation/issues).

## License
Licenced under the [MIT License](LICENSE)