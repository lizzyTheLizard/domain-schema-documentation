import { type Schema, type Model, type Link } from '../../reader/Reader'
import path from 'path'
import { type JavaPluginOptions } from './JavaPlugin'
import { getSimpleJavaClassName, getModuleDir, findSchemaFileInDir } from './JavaHelper'
import { getSchemasForModule } from '../../reader/InputHelper'

/**
 * Validator for Java files
 * @param model The model to validate
 * @param options The java plugin options
 */
export async function javaImplementationLinks(model: Model, options: JavaPluginOptions): Promise<void> {
  if (options.linkSrcDir === undefined || options.srcDir === undefined) return
  for (const module of model.modules) {
    const moduleDir = getModuleDir(module, options.srcDir, options)
    const moduleLinkDir = getModuleDir(module, options.linkSrcDir, options)
    module.links = module.links.map(l => renameExistingLinks(l))
    for (const schema of getSchemasForModule(model, module)) {
      schema['x-links'] = schema['x-links'].map(l => renameExistingLinks(l))
      await addImplementationLink(moduleDir, moduleLinkDir, schema, undefined)
      for (const definitionName of Object.keys(schema.definitions)) {
        await addImplementationLink(moduleDir, moduleLinkDir, schema, definitionName)
      }
    }
  }
}

function renameExistingLinks(l: Link): Link {
  if (!l.text.startsWith('Java-File')) return l
  return { text: 'Generated ' + l.text, link: l.link }
}

async function addImplementationLink(moduleDir: string, moduleLinkDir: string, schema: Schema, definitionName: string | undefined): Promise<void> {
  const filename = await findSchemaFileInDir(moduleDir, schema, definitionName)
  if (!filename) return
  const implementationLink = moduleLinkDir + '/' + getSimpleJavaClassName(schema, definitionName) + '.java'
  if (definitionName === undefined) {
    schema['x-links'].push({ text: 'Actual Java Implementation', link: implementationLink })
  } else {
    schema['x-links'].push({ text: 'Actual Java Implementation(' + definitionName + ')', link: implementationLink })
  }
}
