import { type Application, type Module, type Schema } from '../reader/IReader.js'

export interface IWriter {
  writer: () => Promise<void>
  applicationLinks: (application: Application) => Map<string, string>
  moduleLinks: (module: Module) => Map<string, string>
  schemaLinks: (schema: Schema) => Map<string, string>
}
