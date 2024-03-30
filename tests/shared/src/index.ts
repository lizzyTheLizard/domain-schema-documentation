import * as process from 'process'
import * as path from 'path'
import { compare } from 'dir-compare'
import { promises as fs } from 'fs'
import { createTwoFilesPatch } from 'diff'

export function handleError (error: unknown): void {
  console.error(error)
  process.exit(-2)
}

export async function compareOutput (outputFolder: string): Promise<void> {
  const expectedFolder = path.join(__dirname, '..', 'expected')
  const result = await compare(outputFolder, expectedFolder, { compareContent: true })
  if (result.same) {
    console.log('Directories are identical')
    process.exit(0)
  }
  if (result.diffSet === undefined || result.diffSet.length === 0) {
    console.error('Directories are not identical but no differences found?')
    process.exit(-3)
  }
  await Promise.all(result.diffSet.map(async dif => {
    const actual = path.join(outputFolder, dif.relativePath, dif.name1 ?? '')
    const expected = path.join(expectedFolder, dif.relativePath, dif.name2 ?? '')
    switch (dif.state) {
      case 'left':
        console.error('Path %s must not be present', path.join(dif.relativePath, dif.name1 ?? ''))
        break
      case 'right':
        console.error('Path %s should be present', path.join(dif.relativePath, dif.name2 ?? ''))
        break
      case 'distinct': {
        const file1Contents = (await fs.readFile(actual)).toString()
        const file2Contents = (await fs.readFile(expected)).toString()
        const patch = createTwoFilesPatch(actual, expected, file1Contents, file2Contents)
        console.error('Path %s is different', path.join(dif.relativePath, dif.name1 ?? ''))
        console.error(patch)
        break
      }
      default:
        break
    }
  }))
  process.exit(-1)
}
