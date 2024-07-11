#!/usr/bin/env node

import { defaultReader } from './reader/defaultReader/DefaultReader'
import { htmlWriter } from './writer/html/HtmlWriter'
import minimist from 'minimist'
import { run } from './Run'
import { type Writer } from './writer/Writer'
import { markdownWriter } from './writer/markdown/MarkdownWriter'
import { javaPlugin } from './plugin/java/JavaPlugin'
import { type Plugin } from './plugin/Plugin'
import * as process from 'process'

import { type Reader } from './reader/Reader'

const options = {
  string: ['in', 'out'],
  boolean: ['html', 'md', 'java', 'openapi', 'help', 'h'],
  unknown: (arg: string): boolean => { invalidArgument(arg); return false }
}
const args = minimist(process.argv.slice(2), options)
showHelpIfNeeded(args)

const runOptions = {
  reader: getReader(args),
  writers: getWriters(args),
  plugins: getPlugins(args)
}

run(runOptions).then(() => { console.log('Done') }).catch((error) => { handleError(error) })

function getReader (args: minimist.ParsedArgs): Reader {
  const inputDir: string = args.in as string || './input'
  return defaultReader(inputDir)
}

function getWriters (args: minimist.ParsedArgs): Writer[] {
  const outputDir: string = args.out as string || './out'
  const writers: Writer[] = []
  if (args.html as boolean) {
    writers.push(htmlWriter(outputDir))
  }
  if (args.md as boolean) {
    writers.push(markdownWriter(outputDir))
  }
  return writers
}

function getPlugins (args: minimist.ParsedArgs): Plugin[] {
  const outputDir: string = args.out as string || './out'
  const plugins: Plugin[] = []
  if (args.java as boolean) {
    plugins.push(javaPlugin(outputDir))
  }
  if (args.openapi as boolean) {
    plugins.push(javaPlugin(outputDir))
  }
  return plugins
}

function invalidArgument (arg?: string): void {
  console.error(`Invalid argument: ${arg}`)
  showHelp()
  process.exit(2)
}

function showHelpIfNeeded (args: minimist.ParsedArgs): void {
  if (args.h as boolean || args.help as boolean) {
    showHelp()
    process.exit(0)
  }
}

function showHelp (): void {
  console.log('Usage: openapi-generator [--in <input-dir>] [--out <output-dir>] [--html] [--md] [--java] [--openapi]')
  console.log('Options:')
  console.log('  --in <input-dir>   Input directory containing OpenAPI files (default: ./input)')
  console.log('  --out <output-dir> Output directory for generated files (default: ./out)')
  console.log('  --html             Generate HTML documentation')
  console.log('  --md               Generate Markdown documentation')
  console.log('  --java             Generate Java code')
  console.log('  --openapi          Generate OpenAPI files')
  console.log('  --help, -h         Show this help')
}

function handleError (error: unknown): void {
  console.error(error)
  process.exit(1)
}
