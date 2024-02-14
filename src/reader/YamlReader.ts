import { type Application, type IReader, type Module, type Schema, type SchemaTyp } from './IReader'
import { type Config } from '../config/Config'

export class YamlReader implements IReader {
  readonly #application?: Application | undefined = undefined
  readonly #modules: Module[] | undefined = undefined
  readonly #schemas?: Schema[] | undefined = undefined

  constructor (private readonly config: Config) {}

  public async read (): Promise<void> {
    // TODO: Implement
  }

  public getApplication (): Application {
    if (this.#application === undefined) {
      throw new Error('Reader not finished')
    }
    return this.#application
  }

  public getModules (): Module[] {
    if (this.#modules === undefined) {
      throw new Error('Reader not finished')
    }
    return this.#modules
  }

  public getSchemas (): Schema[] {
    if (this.#schemas === undefined) {
      throw new Error('Reader not finished')
    }
    return this.#schemas
  }

  public getSchemasForModule (module: Module): Schema[] {
    return this.getSchemas().filter(s => s.$id.startsWith(module.$id))
  }

  public getSchemasForModuleAndTyp (module: Module, typ: SchemaTyp): Schema[] {
    return this.getSchemasForModule(module).filter(s => s['x-schema-typ'] === typ)
  }
}
