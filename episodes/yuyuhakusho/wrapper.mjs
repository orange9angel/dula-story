console.log('WRAPPER argv:', process.argv.slice(2));
console.log('WRAPPER cwd:', process.cwd());

import path from 'path';

const EPISODE = process.argv[2] || '.';
const EPISODE_DIR = path.isAbsolute(EPISODE) ? EPISODE : path.resolve(process.cwd(), EPISODE);
console.log('EPISODE:', EPISODE);
console.log('EPISODE_DIR:', EPISODE_DIR);
