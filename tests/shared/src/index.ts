import * as process from 'process'
import * as path from 'path'
import { compare, fileCompareHandlers } from 'dir-compare'
import { promises as fs } from 'fs'
import { createTwoFilesPatch } from 'diff'

/**
 * Handle en error while running the tests. Print the error and exit the process with -2
 * @param error The error to handle
 */
export function handleError(error: unknown): void {
  console.error(error)
  process.exit(-2)
}

/**
 * Compare the output of the generator with the expected output
 * @param outputFolder The folder with the generated output
 * @param expectedFolder The folder with the expected output
 * @param excludeFilter File/directory name exclude filter. Comma separated minimatch patterns. See [Glob patterns](https://github.com/gliviu/dir-compare#glob-patterns).
 */
export async function compareOutput(outputFolder: string, expectedFolder?: string, excludeFilter?: string): Promise<void> {
  expectedFolder = expectedFolder ?? path.join(__dirname, '..', 'expected')
  const result = await compare(outputFolder, expectedFolder, {
    compareContent: true,
    excludeFilter,
    compareFileSync: fileCompareHandlers.lineBasedFileCompare.compareSync,
    compareFileAsync: fileCompareHandlers.lineBasedFileCompare.compareAsync,
    ignoreLineEnding: true, // Ignore crlf/lf line ending differences
  })
  if (result.same) {
    console.log('Directories are identical')
    process.exit(0)
  }
  if (result.diffSet === undefined || result.diffSet.length === 0) {
    console.error('Directories are not identical but no differences found?')
    process.exit(-3)
  }
  await Promise.all(result.diffSet.map(async (dif) => {
    const actualFile = path.join(outputFolder, dif.relativePath, dif.name1 ?? '')
    const expectedFile = path.join(expectedFolder, dif.relativePath, dif.name2 ?? '')
    switch (dif.state) {
      case 'left':
        console.error('Path %s must not be present', path.join(dif.relativePath, dif.name1 ?? ''))
        break
      case 'right':
        console.error('Path %s should be present', path.join(dif.relativePath, dif.name2 ?? ''))
        break
      case 'distinct': {
        const actualContents = (await fs.readFile(actualFile)).toString().replace(/\r?\n/g, '\r\n')
        const expectedContents = (await fs.readFile(expectedFile)).toString().replace(/\r?\n/g, '\r\n')
        const patch = createTwoFilesPatch(expectedFile, actualFile, expectedContents, actualContents)
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
