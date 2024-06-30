import { type Plugin } from '../Plugin'
import { javaGenerator } from './JavaGenerator'
import { javaValidator } from './JavaValidator'
import { javaUpdator } from './JavaUpdator'
import { loadTemplate } from '../../writer/WriterHelpers'
import path from 'path'
import { type FormatName } from 'ajv-formats'
import { type Module } from '../../reader/Reader'

// TODO: Document

export interface JavaPluginOptions {
  mainPackageName: string | undefined
  modelPackageName: string | undefined
  useLombok: boolean
  basicTypeMap: Record<string, string>
  classTemplate: HandlebarsTemplateDelegate
  enumTemplate: HandlebarsTemplateDelegate
  interfaceTemplate: HandlebarsTemplateDelegate
  srcDir: string | ((module: Module) => string) | undefined
  ignoreAdditionalFiles: boolean
}

export function javaPlugin (outputFolder: string, optionsOrUndefined?: JavaPluginOptions): Plugin {
  const options = applyDefaults(optionsOrUndefined)
  return {
    updateModel: javaUpdator(),
    validate: javaValidator(options),
    generateOutput: javaGenerator(outputFolder, options)
  }
}

function applyDefaults (optionsOrUndefined?: JavaPluginOptions): JavaPluginOptions {
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

// Basic JSON Schema types, must be present in basicTypeMap
export const defaultJavaBasicTypeMap = {
  string: 'String',
  integer: 'Integer',
  number: 'Double',
  boolean: 'Boolean',
  null: 'Void'
}

// Mapping for all ajv-formats. As this is the default list of all formats, these should be included in the basicTypeMap
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
