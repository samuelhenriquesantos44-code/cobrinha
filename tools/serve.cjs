const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer((req,res) => {
  let file;
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.split('/').some(part => part.startsWith('.'))) throw new Error();
    file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep)) throw new Error();
  } catch { res.writeHead(400); return res.end('Invalid path'); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(8080, '127.0.0.1', () => console.log('Cobrinha: http://127.0.0.1:8080'));
