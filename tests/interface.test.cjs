const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup(blockStorage = false) {
  const elements = new Map();
  const events = {};
  const storage = new Map();
  const timers = new Map();
  let now = 0, nextId = 0;
  function schedule(callback, delay, interval = false) {
    const id = ++nextId;
    timers.set(id, {callback, at: now + delay, delay, interval});
    return id;
  }
  function advance(milliseconds) {
    const until = now + milliseconds;
    for (;;) {
      const first = [...timers].filter(([,timer]) => timer.at <= until).sort((a,b) => a[1].at - b[1].at)[0];
      if (!first) break;
      const [id,timer] = first;
      now = timer.at;
      if (timer.interval) timer.at += timer.delay;
      else timers.delete(id);
      timer.callback();
    }
    now = until;
  }
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, disabled: false, textContent: '', value: 'normal',
      selectedOptions: [{ textContent: 'Clássico' }],
      focus() {}, addEventListener(type, callback) { this[type] = callback; }
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    SnakeEngine: require('../js/engine.js'),
    document: {
      hidden: false, getElementById: element, querySelectorAll: () => [],
      addEventListener: (type, callback) => { events[type] = callback; }
    },
    window: { addEventListener: (type, callback) => { events[type] = callback; } },
    localStorage: {
      getItem(key) { if (blockStorage) throw Error('Blocked'); return storage.get(key); },
      setItem(key, value) { if (blockStorage) throw Error('Blocked'); storage.set(key, value); }
    },
    renderGame() {},
    setInterval: (callback, delay) => schedule(callback, delay, true),
    clearInterval: id => timers.delete(id),
    setTimeout: (callback, delay) => schedule(callback, delay),
    clearTimeout: id => timers.delete(id)
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), context);
  return { context, element, events, storage, advance, run: code => vm.runInContext(code, context) };
}

test('iniciar, pausar, continuar e reiniciar atualizam a interface', async () => {
  const ui = setup();
  await ui.element('start').click(); ui.advance(3000);
  assert.equal(ui.element('menu').hidden, true);
  assert.equal(ui.element('gameArea').hidden, false);
  ui.element('pause').click();
  assert.equal(ui.run('state.status'), 'paused');
  assert.equal(ui.element('overlay').hidden, false);
  ui.element('overlayAction').click();
  assert.equal(ui.run('state.status'), 'countdown');
  ui.advance(3000);
  assert.equal(ui.run('state.status'), 'running');
  assert.equal(ui.element('overlay').hidden, true);
  await ui.element('restart').click(); ui.advance(3000);
  assert.equal(ui.element('score').textContent, 0);
  ui.element('back').click();
  assert.equal(ui.element('gameArea').hidden, true);
  assert.equal(ui.element('menu').hidden, false);
});

test('troca de aba e janela pausa sem retomar automaticamente', async () => {
  const ui = setup(); await ui.element('start').click(); ui.advance(3000);
  ui.context.document.hidden = true;
  ui.events.visibilitychange();
  assert.equal(ui.run('state.status'), 'paused');
  ui.context.document.hidden = false;
  ui.events.visibilitychange();
  assert.equal(ui.run('state.status'), 'paused');
  ui.element('overlayAction').click();
  ui.advance(3000);
  ui.events.blur();
  assert.equal(ui.run('state.status'), 'paused');
});

test('pontuação e recorde persistem por nível; armazenamento bloqueado não interrompe o jogo', async () => {
  for (const blocked of [false, true]) {
    const ui = setup(blocked); await ui.element('start').click(); ui.advance(3000);
    ui.run('state.food = {x:220,y:200}; tick();');
    assert.equal(ui.element('score').textContent, 1);
    assert.equal(ui.element('record').textContent, 1);
    if (!blocked) assert.equal(ui.storage.get('cobrinha:walls-v2:record:normal'), '1');
    await ui.element('restart').click(); ui.advance(3000);
    assert.equal(ui.element('record').textContent, blocked ? 0 : 1);
    ui.element('difficulty').value = 'easy';
    await ui.element('restart').click(); ui.advance(3000);
    assert.equal(ui.element('record').textContent, 0);
  }
});

test('setas bloqueiam rolagem e espaço alterna pausa', async () => {
  const ui = setup(); await ui.element('start').click(); ui.advance(3000);
  let prevented = 0;
  const key = (value, code) => ui.events.keydown({key:value, code, target:{tagName:'BUTTON'}, preventDefault() { prevented++; }});
  key('ArrowUp', 'ArrowUp');
  assert.equal(ui.run('state.nextDir'), 'UP');
  key(' ', 'Space');
  assert.equal(ui.run('state.status'), 'paused');
  key(' ', 'Space');
  assert.equal(ui.run('state.status'), 'countdown');
  ui.advance(3000);
  assert.equal(ui.run('state.status'), 'running');
  assert.equal(prevented, 3);
  ui.run("state.status = 'lost'");
  key(' ', 'Space');
  assert.equal(prevented, 3, 'Espaço continua ativando o botão de jogar novamente ao perder');
});


test('contagem exibe 3, 2, 1 e só então libera o movimento', async () => {
  const ui=setup(); await ui.element('start').click();
  const initial=ui.run('JSON.stringify(state.snake)');
  assert.equal(ui.run('state.status'),'countdown');
  assert.equal(ui.element('countdownNumber').textContent,3);
  ui.advance(1000);
  assert.equal(ui.element('countdownNumber').textContent,2);
  ui.advance(1000);
  assert.equal(ui.element('countdownNumber').textContent,1);
  ui.run('tick()');
  assert.equal(ui.run('JSON.stringify(state.snake)'),initial);
  assert.equal(ui.run('roundContext.moves.length'),0);
  ui.advance(1000);
  assert.equal(ui.run('state.status'),'running');
  assert.equal(ui.element('countdown').hidden,true);
  ui.advance(110);
  assert.notEqual(ui.run('JSON.stringify(state.snake)'),initial);
});

test('sair da aba durante a contagem pausa e exige nova contagem completa', async () => {
  const ui=setup(); await ui.element('start').click();
  ui.advance(1000);
  ui.context.document.hidden=true;
  ui.events.visibilitychange();
  ui.advance(10000);
  assert.equal(ui.run('state.status'),'paused');
  assert.equal(ui.run('state.snake[0].x'),200);
  ui.context.document.hidden=false;
  ui.events.visibilitychange();
  assert.equal(ui.run('state.status'),'paused');
  ui.element('overlayAction').click();
  assert.equal(ui.element('countdownNumber').textContent,3);
  ui.advance(2999);
  assert.equal(ui.run('state.status'),'countdown');
  ui.advance(1);
  assert.equal(ui.run('state.status'),'running');
});

test('menu e reinício cancelam contagens antigas', async () => {
  const ui=setup(); await ui.element('start').click();
  ui.advance(2000);
  await ui.element('restart').click();
  ui.advance(1000);
  assert.equal(ui.run('state.status'),'countdown');
  assert.equal(ui.element('countdownNumber').textContent,2);
  ui.element('back').click();
  ui.advance(10000);
  assert.equal(ui.run('state'),null);
  assert.equal(ui.element('countdown').hidden,true);
});

test('uma partida preparada em aba oculta permanece pausada', async () => {
  const ui=setup(); ui.context.document.hidden=true;
  await ui.element('start').click();
  ui.advance(10000);
  assert.equal(ui.run('state.status'),'paused');
  assert.equal(ui.run('roundContext.moves.length'),0);
});


test('voltar ao menu cancela o início enquanto a sessão online está sendo preparada', async () => {
  const ui=setup();
  let release;
  ui.context.RankingClient={
    profile:()=>({nickname:'Amigo'}),
    startRound:()=>new Promise(resolve=>{release=resolve;}),
    begin:()=>{throw Error('Uma sessão cancelada não deve iniciar');}
  };
  const preparing=ui.element('start').click();
  ui.element('back').click();
  release({id:'cancelled',seed:1});
  await preparing;
  ui.advance(10000);
  assert.equal(ui.run('state'),null);
  assert.equal(ui.element('menu').hidden,false);
  assert.equal(ui.element('gameArea').hidden,true);
  assert.equal(ui.element('start').disabled,false);
});
