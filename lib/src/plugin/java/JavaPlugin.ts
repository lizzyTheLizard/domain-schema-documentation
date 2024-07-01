import { type Plugin } from '../Plugin'
import { javaGenerator } from './JavaGenerator'
import { javaValidator } from './JavaValidator'
import { javaUpdator } from './JavaUpdator'
import { loadTemplate } from '../../writer/WriterHelpers'
import path from 'path'
import { type FormatName } from 'ajv-formats'
import { type Module } from '../../reader/Reader'

/**
 * Options for the Java plugin.
 */
export interface JavaPluginOptions {
  /**
   * The main package name for the generated Java classes. The package name will be
   * ${mainPackageName}.#{modelName}.${modelPackageName}. Can be left undefined if there is no main package name
   * Default is undefined.
   */
  mainPackageName: string | undefined
  /**
   * The model package name for the generated Java classes. The package name will be
   * ${mainPackageName}.#{modelName}.${modelPackageName}. Can be left undefined if there is no model package name
   * Default is undefined.
   */
  modelPackageName: string | undefined
  /**
   * Should Lombok annotations be used in the generated Java classes. Default is true.
   */
  useLombok: boolean
  /**
   * Mapping of JSON Schema types and formats to Java types. Default is @see defaultJavaBasicTypeMap and @see defaultJavaFormatMap.
   */
  basicTypeMap: Record<string, string>
  /**
   * Handlebars template for generating Java classes. Default is the class.hbs template.
   */
  classTemplate: HandlebarsTemplateDelegate
  /**
   * Handlebars template for generating Java enums. Default is the enum.hbs template.
   */
  enumTemplate: HandlebarsTemplateDelegate
  /**
   * Handlebars template for generating Java interfaces. Default is the interface.hbs template.
   */
  interfaceTemplate: HandlebarsTemplateDelegate
  /**
   * The source directory for the Java classes to validate. If undefined, no validation will be done.
   * You can also provide a function that takes a module and returns the source directory if the source directory is different for each module.
   * Default is undefined.
   */
  srcDir: string | ((module: Module) => string) | undefined
  /**
   * If true, files in the source directory that do not match a domain model schema will be ignored. If false they will be considered as errors
   * Default is true.
   */
  ignoreAdditionalFiles: boolean
}

/**
 * A plugin that generates Java classes and validate existing Java classes.
 * @param outputFolder The folder to write the output to. Should be the same as the output folder of the writer.
 * @param optionsOrUndefined Options, @see JavaPluginOptions
 */
export function javaPlugin (outputFolder: string, optionsOrUndefined?: Partial<JavaPluginOptions>): Plugin {
  const options = applyDefaults(optionsOrUndefined)
  return {
    updateModel: javaUpdator(),
    validate: javaValidator(options),
    generateOutput: javaGenerator(outputFolder, options)
  }
}

function applyDefaults (optionsOrUndefined?: Partial<JavaPluginOptions>): JavaPluginOptions {
  return {
    mainPackageName: optionsOrUndefined?.mainPackageName ?? 'com.example',
    modelPackageName: optionsOrUndefined?.modelPackageName ?? 'model',
    useLombok: optionsOrUndefined?.useLombok ?? true,
    basicTypeMap: optionsOrUndefined?.basicTypeMap ?? { ...defaultJavaBasicTypeMap, ...defaultJavaFormatMap },
    classTemplate: optionsOrUndefined?.classTemplate ?? loadTemplate(path.join(__dirname, 'class.hbs')),
    enumTemplate: optionsOrUndefined?.enumTemplate ?? loadTemplate(path.join(__dirname, 'enum.hbs')),
    interfaceTemplate: optionsOrUndefined?.interfaceTemplate ?? loadTemplate(path.join(__dirname, 'interface.hbs')),
    srcDir: optionsOrUndefined?.srcDir,
    ignoreAdditionalFiles: optionsOrUndefined?.ignoreAdditionalFiles ?? true
  }
}

/**
 * Basic JSON Schema types, must be present in basicTypeMap
 */
export const defaultJavaBasicTypeMap = {
  string: 'String',
  integer: 'Integer',
  number: 'Double',
  boolean: 'Boolean',
  null: 'Void'
}

/**
 * Mapping for all ajv-formats. As this is the default list of all formats, these should be included in the basicTypeMap
 */
export const defaultJavaFormatMap: Record<FormatName, string> = {
  date: 'java.time.LocalDate',
  time: 'java.time.OffsetTime',
  'date-time': 'java.time.OffsetDateTime',
  'iso-time': 'java.time.LocalTime',
  'iso-date-time': 'java.time.LocalDateTime',
  duration: 'java.time.Duration',
  uri: 'java.net.URI',
  'uri-reference': 'String',
  'uri-template': 'String',
  url: 'java.net.URL',
  email: 'String',
  hostname: 'String',
  ipv4: 'java.net.Inet4Address',
  ipv6: 'java.net.Inet6Address',
  regex: 'String',
  uuid: ' java.util.UUID',
  'json-pointer': 'String',
  'json-pointer-uri-fragment': 'String',
  'relative-json-pointer': 'String',
  byte: 'Byte',
  float: 'Float',
  double: 'Double',
  password: 'String',
  binary: 'byte[]',
  int32: 'Integer',
  int64: 'Long'
}
