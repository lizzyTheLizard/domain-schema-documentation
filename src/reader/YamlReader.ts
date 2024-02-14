import { type Application, type IReader, type Module, type Schema, type SchemaTyp } from './IReader'
import { type Config } from '../config/Config'
import { promises as fs } from 'fs'
import path from 'path'
import * as yaml from 'yaml'
import Ajv from "ajv";
import moduleSchema from './moduleSchema.json';
import applicationSchema from './applicationSchema.json';

export class YamlReader implements IReader {
  #application?: Application | undefined = undefined
  #modules: Module[] | undefined = undefined
  #schemas?: Schema[] | undefined = undefined
  readonly #ajv: Ajv;

  constructor (private readonly config: Config) {
    this.#ajv = new Ajv(config.ajvOps ?? {allErrors: true});
  }

  public async read (): Promise<void> {
    const applicationFile = path.join(this.config.inputFolder, 'index.yaml');
    this.#application = await this.loadApplicationFile(applicationFile);

    this.#modules = [];
    this.#schemas = [];
    await this.readFolderRecursive(this.config.inputFolder);
    this.validate();
  }

  private async readFolderRecursive(folder: string): Promise<void> {
    const files = await fs.readdir(folder);
    for (const file of files) {
      const filePath = path.join(folder, file);
      const lstat = await fs.lstat(filePath);
      if (!lstat.isDirectory()) {
        await this.readFolderRecursive(filePath);
      } else if (file === "index.yaml") {
        const module = await this.readModuleFile(filePath);
        this.#modules?.push(module);
      } else if (file.endsWith(".yaml")) {
        const schema = await this.readSchemaFile(filePath);
        this.#schemas?.push(schema);
      } else {
        throw new Error(`Unexpected file ${filePath}. All files must have .yaml ending`)
      }
    }
  }

  protected async loadApplicationFile(filePath: string): Promise<Application> {
    const contend = await fs.readFile(filePath);
    const parsed = yaml.parse(contend.toString());
    this.validateApplicationSchema(parsed, filePath);
    return parsed;
  }

  protected validateApplicationSchema(parsed: any, filePath: string): void {
    if(!this.#ajv.validate(applicationSchema, parsed)) {
      console.log(this.#ajv.errors);
      throw new Error(`Invalid application file ${filePath}: ${this.#ajv.errorsText(this.#ajv.errors)}`);
    }
  }

  protected async readModuleFile(filePath: string): Promise<Module> {
    const contend = await fs.readFile(filePath);
    const parsed = yaml.parse(contend.toString());
    this.validateModuleSchema(parsed, filePath);
    return parsed;
  }

  protected validateModuleSchema(parsed: any, filePath: string): void {
    if(!this.#ajv.validate(moduleSchema, parsed)) {
      console.log(this.#ajv.errors);
      throw new Error(`Invalid module file ${filePath}: ${this.#ajv.errorsText(this.#ajv.errors)}`);
    }
  }

  protected async readSchemaFile(filePath: string): Promise<Schema> {
    const contend = await fs.readFile(filePath);
    const parsed = yaml.parse(contend.toString());
    this.validateSchemaSchema(parsed, filePath);
    return parsed;
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
