import * as tmp from 'tmp'
import path from 'path'
import { promises as fs } from 'fs'
import { testModel } from '../../testData'
import { JavaPluginOptions } from './JavaPlugin'
import { javaImplementationLinks } from './JavaImplementationLinks'

describe('JavaImplementation', () => {
  test('Rename Existing Links', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { ...testModel() }
    model.modules[0].links = [{ text: 'Java-Files', link: 'LLLM' }]
    model.schemas[0]['x-links'] = [{ text: 'Java-File', link: 'LLLS' }]
    const options = { srcDir: tmpDir.name, linkSrcDir: '../src' } as unknown as JavaPluginOptions

    await javaImplementationLinks(model, options)

    expect(model.application.links).toEqual([])
    expect(model.modules[0].links).toEqual([{ text: 'Generated Java-Files', link: 'LLLM' }])
    expect(model.schemas[0]['x-links']).toEqual([{ text: 'Generated Java-File', link: 'LLLS' }])
  })

  test('Add implementation links', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema {}')
    const model = { ...testModel() }
    const options = { srcDir: tmpDir.name, linkSrcDir: '../src' } as unknown as JavaPluginOptions

    await javaImplementationLinks(model, options)

    expect(model.application.errors).toEqual([])
    expect(model.modules[0].links).toEqual([])
    expect(model.schemas[0]['x-links']).toEqual([{ text: 'Actual Java Implementation', link: '../src/module/Schema.java' }])
  })

  test('Do not add implementation links if file not existing', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const model = { ...testModel() }
    const options = { srcDir: tmpDir.name, linkSrcDir: '../src' } as unknown as JavaPluginOptions

    await javaImplementationLinks(model, options)

    expect(model.application.errors).toEqual([])
    expect(model.modules[0].links).toEqual([])
    expect(model.schemas[0]['x-links']).toEqual([])
  })

  test('Do nothing if not configured', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const filename = path.join(tmpDir.name, 'module', 'Schema.java')
    await fs.mkdir(path.join(tmpDir.name, 'module'))
    await fs.writeFile(filename, 'package module; public class Schema {}')
    const model = { ...testModel() }
    model.modules[0].links = [{ text: 'Java-Files', link: 'LLLM' }]
    model.schemas[0]['x-links'] = [{ text: 'Java-File', link: 'LLLS' }]
    const options = { srcDir: tmpDir.name } as unknown as JavaPluginOptions

    await javaImplementationLinks(model, options)

    expect(model.application.links).toEqual([])
    expect(model.modules[0].links).toEqual([{ text: 'Java-Files', link: 'LLLM' }])
    expect(model.schemas[0]['x-links']).toEqual([{ text: 'Java-File', link: 'LLLS' }])
  })
})
