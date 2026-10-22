import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
await mkdir('dist/server', {recursive:true});
await mkdir('dist/.openai', {recursive:true});
const engine = await readFile('worker/engine.js', 'utf8');
const worker = await readFile('worker/index.js', 'utf8');
await writeFile('dist/server/index.js', engine + '\n' + worker);
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
console.log('Ranking Worker built');
