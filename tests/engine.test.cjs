const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, createFood, step, turn } = require('../js/engine.js');

test('comida nunca ocupa o corpo, inclusive depois de crescer', () => {
  const game = createGame();
  game.snake = [{ x: 200, y: 220 }];
  game.food = { x: 220, y: 220 };
  assert.equal(step(game, () => 0.55).ate, true);
  assert.equal(game.score, 1);
  assert.equal(game.snake.length, 2);
  assert.ok(!game.snake.some(p => p.x === game.food.x && p.y === game.food.y));
});
test('colisão nas quatro paredes encerra a partida sem atravessar', () => {
  for (const [dir, x, y, ex, ey] of [['RIGHT',380,200,0,200],['LEFT',0,200,380,200],['UP',200,0,200,380],['DOWN',200,380,200,0]]) {
    const game = createGame();
    Object.assign(game, { snake: [{x,y}], dir, nextDir: dir, food: {x:100,y:100} });
    step(game);
    assert.equal(game.status, 'lost');
    assert.equal(game.reason, 'wall');
    assert.deepEqual(game.snake[0], {x,y});
  }
});
test('impede reversão mesmo com múltiplas teclas entre movimentos', () => {
  const game = createGame();
  turn(game, 'UP'); turn(game, 'LEFT');
  assert.equal(game.nextDir, 'UP');
});
test('colisão com o corpo encerra sem alterar a cobra', () => {
  const game = createGame();
  game.snake = [{x:40,y:40},{x:60,y:40},{x:60,y:60},{x:40,y:60}];
  game.food = {x:100,y:100};
  step(game);
  assert.equal(game.status, 'lost');
  assert.equal(game.snake.length, 4);
});
test('permite ocupar a posição que a cauda está deixando', () => {
  const game = createGame();
  game.snake = [{x:40,y:40},{x:40,y:60},{x:60,y:60},{x:60,y:40}];
  game.food = {x:100,y:100};
  step(game);
  assert.equal(game.status, 'running');
  assert.deepEqual(game.snake[0], {x:60,y:40});
});
test('tabuleiro completo termina em vitória sem procurar comida indefinidamente', () => {
  const game = createGame();
  game.snake = [];
  for (let y=0;y<400;y+=20) for (let x=0;x<400;x+=20) if (x!==20 || y!==0) game.snake.push({x,y});
  game.food = {x:20,y:0};
  game.score = 398;
  step(game);
  assert.equal(game.status, 'won');
  assert.equal(game.snake.length, 400);
  assert.equal(game.score, 399);
  assert.equal(game.food, null);
  assert.equal(createFood(game.snake), null);
});
test('pausa e fim de jogo impedem movimento', () => {
  for (const status of ['paused','won','lost']) {
    const game = createGame(); game.status = status;
    const before = JSON.stringify(game);
    turn(game,'UP'); step(game);
    assert.equal(JSON.stringify(game), before);
  }
});
