const { run, defaultReader } = require('domain-schema-documentation');
const {compare, handleError} = require('test-shared');
const {promises: fs} = require("fs");
const path = require("path");


const output = path.join(__dirname, 'out');
const input = path.join(__dirname, '..', 'shared', 'input');

fs.rm(output, {recursive: true, force: true})
  .then(() => run({reader: defaultReader(input)}))
  .then(() => compare(output))
  .catch(error => handleError(error));
