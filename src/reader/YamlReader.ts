import * as yaml from 'yaml'
import { BaseReader } from './BaseReader.ts'
import { promises as fs } from 'fs'

export class YamlReader extends BaseReader {
  protected isIndexFile (filePath: string): boolean {
    return filePath.endsWith('index.yaml')
  }

  protected isSchemaFile (filePath: string): boolean {
    return !filePath.endsWith('index.yaml') && filePath.endsWith('.yaml')
  }

  protected async readFile (filePath: string): Promise<unknown> {
    const contend = await fs.readFile(filePath)
    return yaml.parse(contend.toString())
  }
}
