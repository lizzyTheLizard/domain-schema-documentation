import type Handlebars from 'handlebars'

/** Options for the Markdown writer. */
export interface MarkdownWriterOptions {
  /** Write output to a single output file relativeFilename in the output dir */
  write: (output: string, relativeFilename: string) => Promise<void>
  /** Template for the application documentation */
  applicationTemplate: Handlebars.TemplateDelegate
  /** Template for the module documentation */
  moduleTemplate: Handlebars.TemplateDelegate
  /** Template for the schema documentation */
  schemaTemplate: Handlebars.TemplateDelegate
}
