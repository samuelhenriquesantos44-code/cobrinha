const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../js/territory-engine.js');
const cell=(x,y)=>y*E.SIZE+x;
function random(seed=42) {return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function path(state,dirs,rng=random()) {for(const dir of dirs){E.turn(state,dir);E.step(state,rng);}}

test('três bases distintas, dificuldade válida e reversão bloqueada',()=>{
  const state=E.createGame('unknown');
  assert.equal(state.level,'normal');
  for(const actor of state.actors)assert.equal(E.count(state,actor.id),25);
  assert.equal(E.turn(state,'DOWN'),false);
  assert.equal(E.turn(state,'invalid'),false);
  assert.equal(E.turn(state,'RIGHT'),true);
  assert.equal(E.remaining(state),90);
});
test('rastro só vira território ao fechar, preenchendo o interior e mantendo o exterior livre',()=>{
  const state=E.createGame('easy'),rng=random();
  path(state,Array(6).fill('UP'),rng);
  assert.equal(E.count(state,1),25);assert.ok(state.actors[0].trail.length>0);
  path(state,[...Array(6).fill('RIGHT'),...Array(6).fill('DOWN'),...Array(6).fill('LEFT')],rng);
  assert.equal(state.status,'running');
  assert.ok(E.count(state,1)>50);assert.equal(state.grid[cell(7,16)],1);
  assert.equal(state.grid[cell(0,0)],0);assert.equal(state.actors[0].trail.length,0);
  assert.equal(state.trails.filter(owner=>owner===1).length,0);
  assert.ok(state.peak>25/576*100);
});
test('sair pela borda e cruzar o próprio rastro encerram a disputa',()=>{
  let state=E.createGame();Object.assign(state.actors[0],{x:0,y:0,dir:'LEFT',nextDir:'LEFT'});
  E.step(state);assert.equal(state.status,'lost');assert.equal(state.reason,'wall');
  state=E.createGame();state.grid[cell(4,18)]=0;state.trails[cell(4,18)]=1;state.actors[0].trail=[cell(4,18)];
  E.step(state);assert.equal(state.reason,'self');assert.equal(state.trails.includes(1),false);
});
test('cortar rastro elimina bot e libera suas casas; bot também pode cortar o jogador',()=>{
  let state=E.createGame();state.trails[cell(4,18)]=2;state.actors[1].trail=[cell(4,18)];
  E.step(state);assert.equal(state.actors[1].alive,false);assert.equal(E.count(state,2),0);assert.equal(state.actors[0].cuts,1);
  state=E.createGame();state.ticks=1;state.actors[0].x=8;state.trails[cell(18,4)]=1;state.actors[0].trail=[cell(18,4)];state.actors[1].plan=['LEFT'];
  E.step(state,random());assert.equal(state.status,'lost');assert.equal(state.reason,'trail');
});
test('cabeça protegida em seu território vence choque na troca de casas',()=>{
  const state=E.createGame();state.ticks=1;
  Object.assign(state.actors[0],{x:18,y:4,dir:'RIGHT',nextDir:'RIGHT'});state.actors[1].plan=['LEFT'];
  E.step(state,random());assert.equal(state.status,'lost');assert.equal(state.reason,'head');assert.equal(state.actors[1].alive,true);
});
test('50% vence; tempo compara áreas, empate existe e pausa não avança relógio',()=>{
  let state=E.createGame();state.grid.fill(1,0,300);E.step(state,random());assert.equal(state.status,'won');assert.equal(state.reason,'target');
  state=E.createGame();state.ticks=Math.ceil(E.DURATION*1000/E.STEP_MS)-1;E.step(state,random());assert.equal(state.status,'draw');assert.equal(state.reason,'time');
  state=E.createGame();state.status='paused';const snapshot=JSON.stringify(state);E.step(state);assert.equal(JSON.stringify(state),snapshot);
});
test('bots fecham áreas em simulações e estado mantém rastros e posições válidos',()=>{
  for(const level of ['easy','normal','hard']) {
    const state=E.createGame(level),rng=random(72);let conquered=false;
    // A rota do jogador fica em sua base para observar os bots sem atravessar bordas.
    const dirs=['RIGHT','DOWN','LEFT','UP'];
    for(let i=0;i<480&&state.status==='running';i++) {
      E.turn(state,dirs[i%4]);E.step(state,rng);
      conquered ||= state.events.some(event=>event.type==='claim'&&event.id!==1&&event.cells>0);
      for(const actor of state.actors)if(actor.alive)assert.ok(actor.x>=0&&actor.y>=0&&actor.x<24&&actor.y<24);
      state.trails.forEach((owner,position)=>{if(owner)assert.ok(state.actors[owner-1].alive&&state.actors[owner-1].trail.includes(position));});
    }
    assert.equal(conquered,true,level+' precisa de bots que conquistem áreas');
  }
});
