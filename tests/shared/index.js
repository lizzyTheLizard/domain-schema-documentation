const fs = require('fs').promises;
const path = require('path');
const dircompare = require('dir-compare');
const { createTwoFilesPatch } = require('diff');

function handleError(error) {
  console.error(error);
  process.exit(-2);
}

async function compare(outputFolder) {
  const expectedFolder = path.join(__dirname, 'expected');
  const result = await dircompare.compare(outputFolder, expectedFolder, {compareContent: true});
  if (result.same) {
    console.log('Directories are identical')
    process.exit(0)
  }
  await Promise.all(result.diffSet.map(async dif => {
    const actual = path.join(outputFolder, dif.relativePath, dif.name1);
    const expected = path.join(expectedFolder, dif.relativePath, dif.name2);
    switch (dif.state) {
      case "left":
        console.error('Path %s must not be present', path.join(dif.relativePath, dif.name1))
        break;
      case "right":
        console.error('Path %s should be present', path.join(dif.relativePath, dif.name2))
        break;
      case "distinct":
        const file1Contents = (await fs.readFile(actual)).toString();
        const file2Contents = (await fs.readFile(expected)).toString();
        const patch = createTwoFilesPatch(actual, expected, file1Contents, file2Contents);
        console.error('Path %s is different', path.join(dif.relativePath, dif.name1))
        console.error(patch)
        break;
    }
  }));
  process.exit(-1)
}

exports.handleError = handleError;
exports.compare = compare;