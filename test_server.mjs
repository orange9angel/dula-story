import http from 'http';
import fs from 'fs';
import path from 'path';

const EPISODE_DIR = 'D:\\opensource\\movie\\dula-story\\episodes\\dunk_master_doraemon';
const __dirname = 'D:\\opensource\\movie\\dula-story\\node_modules\\dula-engine';

const server = http.createServer((req, res) => {
  const reqPath = req.url.split('?')[0];
  console.log('Request:', reqPath);
  
  if (reqPath.startsWith('/episode/')) {
    const relPath = reqPath.slice('/episode/'.length);
    const filePath = path.join(EPISODE_DIR, relPath);
    console.log('  -> filePath:', filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log('  -> Error:', err.message);
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      console.log('  -> Success, size:', data.length);
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
    return;
  }
  
  if (reqPath.startsWith('/node_modules/')) {
    const storyRoot = path.resolve(__dirname, '..');
    const filePath = path.join(storyRoot, reqPath);
    console.log('  -> node_modules filePath:', filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(8767, () => console.log('Test server on http://localhost:8767'));
setTimeout(() => { server.close(); console.log('Server closed'); }, 5000);
