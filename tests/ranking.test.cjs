const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const Engine = require('../js/engine.js');
let service;
async function app() {
  if (!service) {
    const engine = fs.readFileSync(path.join(__dirname,'../js/engine.js'),'utf8');
    const worker = fs.readFileSync(path.join(__dirname,'../ranking-service/worker/index.js'),'utf8');
    service = import('data:text/javascript;base64,'+Buffer.from(engine+'\n'+worker).toString('base64'));
  }
  return service;
}
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(path.join(__dirname,'../ranking-service/drizzle/0000_ranking.sql'),'utf8').replaceAll('--> statement-breakpoint',''));
  const adapter = { prepare(sql) {
    let args = [];
    return { bind(...values) { args=values; return this; },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async all() { return { results:sqlite.prepare(sql).all(...args) }; },
      async run() { return {meta:sqlite.prepare(sql).run(...args)}; }
    };
  }, async batch(queries) {
    sqlite.exec('BEGIN');
    try { const results=[]; for (const query of queries) results.push(await query.run()); sqlite.exec('COMMIT'); return results; }
    catch(error) { sqlite.exec('ROLLBACK'); throw error; }
  }};
  return {sqlite,DB:adapter};
}
async function request(env,route,body,origin='http://127.0.0.1:8080') {
  const {default:worker}=await app();
  return worker.fetch(new Request('https://ranking.example'+route,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env);
}
function replay(seed) {
  const random=Engine.seededRandom(seed),game=Engine.createGame(random),moves=[];
  const code={LEFT:'L',RIGHT:'R',UP:'U',DOWN:'D'};
  const move=dir=>{Engine.turn(game,dir); moves.push(code[dir]); Engine.step(game,random);};
  const food={...game.food};
  if (food.x<200) move('UP');
  while(game.snake[0].x!==food.x) move(game.snake[0].x<food.x?'RIGHT':'LEFT');
  while(game.snake[0].y!==food.y) move(game.snake[0].y<food.y?'DOWN':'UP');
  assert.ok(game.score>=1);
  while(game.status==='running') move(game.dir);
  return moves.join('');
}

test('ranking começa vazio e permite CORS apenas para o jogo',async()=>{
  const env=database();
  const response=await request(env,'/ranking?difficulty=normal');
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).entries,[]);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:8080');
  assert.equal((await request(env,'/ranking?difficulty=normal',null,'https://unrelated.example')).status,403);
  assert.equal((await request(env,'/ranking?difficulty=nope')).status,400);
  assert.equal((await request(env,'/health')).status,200);
});
test('servidor recalcula pontos, persiste melhor resultado e rejeita reenvio',async()=>{
  const env=database(),token=crypto.randomUUID();
  async function play() {
    const response=await request(env,'/sessions',{difficulty:'normal'});
    assert.equal(response.status,201);
    const round=await response.json();
    env.sqlite.prepare('UPDATE runs SET created_at=? WHERE id=?').run(Date.now()-60000,round.id);
    return {runId:round.id,playerToken:token,nickname:'Amigo 1',moves:replay(round.seed),score:999999};
  }
  const first=await play();
  const saved=await request(env,'/scores',first);
  assert.equal(saved.status,200);
  const score=(await saved.json()).score;
  assert.ok(score>=1 && score<399, 'pontuação inventada pelo cliente é ignorada');
  assert.equal((await request(env,'/scores',first)).status,409);
  const second=await play();
  assert.equal((await request(env,'/scores',second)).status,200);
  const rows=await (await request(env,'/ranking?difficulty=normal')).json();
  assert.equal(rows.entries.length,1);
  assert.equal(rows.entries[0].nickname,'Amigo 1');
  assert.ok(rows.entries[0].score>=score);
  assert.equal(rows.entries[0].position,1);
  assert.equal(rows.entries[0].id.length,16);
  assert.equal((await (await request(env,'/ranking?difficulty=easy')).json()).entries.length,0);
});
test('rejeita apelido com HTML, partida incompleta, expirada e duração impossível',async()=>{
  const env=database();
  const round=await (await request(env,'/sessions',{difficulty:'hard'})).json();
  const body={runId:round.id,playerToken:crypto.randomUUID(),nickname:'<script>',moves:'R'};
  assert.equal((await request(env,'/scores',body)).status,400);
  body.nickname='Amigo 2';
  assert.equal((await request(env,'/scores',body)).status,400);
  body.moves=replay(round.seed);
  assert.equal((await request(env,'/scores',body)).status,400);
  env.sqlite.prepare('UPDATE runs SET created_at=? WHERE id=?').run(Date.now()-3*3600000,round.id);
  assert.equal((await request(env,'/scores',body)).status,400);
  assert.equal((await (await request(env,'/ranking?difficulty=hard')).json()).entries.length,0);
});
test('limita criação repetida de partidas e retorna ao serviço após falha de banco',async()=>{
  const env=database();
  for(let i=0;i<20;i++) assert.equal((await request(env,'/sessions',{difficulty:'easy'})).status,201);
  assert.equal((await request(env,'/sessions',{difficulty:'easy'})).status,429);
  const offline={DB:{prepare(){throw Error('Offline');}}};
  assert.equal((await request(offline,'/ranking?difficulty=easy')).status,503);
});

test('o serviço publicado usa as mesmas regras do navegador',()=>{
  assert.equal(fs.readFileSync(path.join(__dirname,'../ranking-service/worker/engine.js'),'utf8').replaceAll('\r\n','\n'),fs.readFileSync(path.join(__dirname,'../js/engine.js'),'utf8').replaceAll('\r\n','\n'));
});
