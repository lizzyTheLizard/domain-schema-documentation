import { type Application, type IReader, type Module, type Schema, type SchemaTyp } from './IReader'
import { type Config } from '../config/Config'

export class DefaultReader implements IReader {
  readonly #application?: Application | undefined = undefined
  readonly #modules: Module[] | undefined = undefined
  readonly #schemas?: Schema[] | undefined = undefined

  constructor (private readonly config: Config) {}

  async read (): Promise<void> {
    // TODO: Implement
  }

  getApplication (): Application {
    if (this.#application === undefined) {
      throw new Error('Reader not finished')
    }
    return this.#application
  }

  getModules (): Module[] {
    if (this.#modules === undefined) {
      throw new Error('Reader not finished')
    }
    return this.#modules
  }

  getSchemas (): Schema[] {
    if (this.#schemas === undefined) {
      throw new Error('Reader not finished')
    }
    return this.#schemas
  }

  getSchemasForModule (module: Module): Schema[] {
    return this.getSchemas().filter(s => s.$id.startsWith(module.$id))
  }

  getSchemasForModuleAndTyp (module: Module, typ: SchemaTyp): Schema[] {
    return this.getSchemasForModule(module).filter(s => s['x-schema-typ'] === typ)
  }
}
