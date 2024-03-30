import type Handlebars from 'handlebars'
// TODO Document HTMLWriter and Options
export interface HtmlWriterOptions {
  write: (output: string, relativeFilename: string) => Promise<void>
  basicTemplate: Handlebars.TemplateDelegate
  applicationTemplate: Handlebars.TemplateDelegate
  moduleTemplate: Handlebars.TemplateDelegate
  schemaTemplate: Handlebars.TemplateDelegate
}
