import type Handlebars from 'handlebars'

// TODO Document MarkdownWriter and Options
export interface MarkdownWriterOptions {
  write: (output: string, relativeFilename: string) => Promise<void>
  applicationTemplate: Handlebars.TemplateDelegate
  moduleTemplate: Handlebars.TemplateDelegate
  schemaTemplate: Handlebars.TemplateDelegate
}
