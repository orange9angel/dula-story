import path from 'path';

const EPISODE = 'D:\\opensource\\movie\\dula-story\\episodes\\yuyuhakusho';
const EPISODE_DIR = path.isAbsolute(EPISODE) ? EPISODE : path.resolve(process.cwd(), EPISODE);
console.log('EPISODE_DIR:', EPISODE_DIR);
console.log('isAbsolute:', path.isAbsolute(EPISODE));
