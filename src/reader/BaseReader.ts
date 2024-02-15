import { type Application, type IReader, type Module, type Schema, type SchemaTyp } from './IReader.ts'
import { type Config } from '../config/Config.ts'
import { promises as fs } from 'fs'
import path from 'path'
import { type InputValidator } from './InputValidator.ts'

export abstract class BaseReader implements IReader {
  #application?: Application | undefined = undefined
  #modules: Module[] = []
  #schemas: Schema[] = []

  protected constructor (private readonly config: Config, private  readonly inputValidator: InputValidator) {
  }

  public async read (): Promise<void> {
    this.#modules = []
    this.#schemas = []
    await this.readFolderRecursive(this.config.inputFolder, 0)
    this.inputValidator.validate(this)
  }

  private async readFolderRecursive (folder: string, depth: number): Promise<void> {
    const files = await fs.readdir(folder)
    for (const file of files) {
      const filePath = path.join(folder, file)
      const lstat = await fs.lstat(filePath)
      if (!lstat.isDirectory()) {
        await this.readFolderRecursive(filePath, depth + 1)
      } else if (this.isIndexFile(filePath) && depth === 0) {
        const application = await this.readFile(filePath)
        this.inputValidator.validateApplicationFile(application, filePath)
        this.#application = application as Application
      } else if (this.isIndexFile(filePath) && depth > 0) {
        const module = await this.readFile(filePath) as Module
        this.inputValidator.validateModuleFile(module, filePath)
        this.#modules?.push(module)
      } else if (this.isSchemaFile(filePath)) {
        const schema = await this.readFile(filePath) as Schema
        this.inputValidator.validateSchemaFile(schema, filePath)
        this.#schemas?.push(schema)
      } else {
        throw new Error(`Unexpected file ${filePath}. Not a valid input file`)
      }
    }
  }

  protected abstract isIndexFile (filePath: string): boolean

  protected abstract isSchemaFile (filePath: string): boolean

  protected abstract readFile (filePath: string): Promise<unknown>

  public getApplication (): Application {
    if (!this.#application) {
      throw new Error('Reader not finished')
    }
    return this.#application
  }

  public getModules (): Module[] {
    if (!this.#application) {
      throw new Error('Reader not finished')
    }
    return this.#modules
  }

  public getSchemas (): Schema[] {
    if (!this.#application) {
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
