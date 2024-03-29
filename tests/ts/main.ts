import {run, defaultReader} from 'domain-schema-documentation';
import {compare, handleError} from 'test-shared';
import {promises as fs} from 'fs';
import * as path from 'path';


const output = path.join(__dirname, 'out');
const input = path.join(__dirname, '..', 'shared', 'input');

fs.rm(output, {recursive: true, force: true})
.then(() => run({reader: defaultReader(input)}))
.then(() => compare(output))
.catch(error => handleError(error));
