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
      hidden: false, disabled: false, textContent: '', value: 'normal', clientWidth: 300,
      selectedOptions: [{ textContent: 'Clássico' }],
      focus() {}, addEventListener(type, callback) { this[type] = callback; }
    });
    return elements.get(id);
  };
  const buttons = ['UP','DOWN','LEFT','RIGHT'].map(dir => {
    const button = element('dir'+dir);
    button.dataset = {dir};
    return button;
  });
  const context = vm.createContext({
    SnakeEngine: require('../js/engine.js'),
    document: {
      hidden: false, getElementById: element, querySelectorAll: () => buttons,
      addEventListener: (type, callback) => { events[type] = callback; }
    },
    window: { PointerEvent: function PointerEvent() {}, addEventListener: (type, callback) => { events[type] = callback; } },
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
  assert.equal(ui.run('directionQueue[0]'), 'UP');
  ui.advance(110);
  assert.equal(ui.run('state.dir'), 'UP');
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


function pointer(ui, id, type, values = {}) {
  const event = {pointerId:1,pointerType:'touch',button:0,clientX:150,clientY:150,target:{closest:()=>null},prevented:false,preventDefault(){this.prevented=true;},...values};
  ui.element(id)[type](event);
  return event;
}

test('setas respondem ao encostar e não repetem o comando no click do toque', async () => {
  const ui=setup(); await ui.element('start').click(); ui.advance(3000);
  const touch=pointer(ui,'dirUP','pointerdown');
  assert.equal(touch.prevented,true);
  assert.equal(ui.run('directionQueue.join()'),'UP');
  ui.element('dirUP').click({detail:1});
  assert.equal(ui.run('directionQueue.join()'),'UP');
  ui.advance(110);
  assert.equal(ui.run('state.dir'),'UP');
  assert.equal(ui.run('state.snake[0].y'),180);
  ui.element('dirLEFT').click({detail:0});
  ui.advance(110);
  assert.equal(ui.run('state.dir'),'LEFT','ativação por teclado continua funcionando');
});

test('duas curvas rápidas são aplicadas em movimentos consecutivos sem reversão', async () => {
  const ui=setup(); await ui.element('start').click(); ui.advance(3000);
  pointer(ui,'dirUP','pointerdown');
  pointer(ui,'dirDOWN','pointerdown');
  pointer(ui,'dirUP','pointerdown');
  pointer(ui,'dirLEFT','pointerdown',{pointerId:2});
  pointer(ui,'dirDOWN','pointerdown');
  assert.equal(ui.run('directionQueue.join()'),'UP,LEFT');
  ui.advance(110);
  assert.equal(ui.run('state.dir'),'UP');
  ui.advance(110);
  assert.equal(ui.run('state.dir'),'LEFT');
  assert.equal(ui.run('roundContext.moves.join()'),'UP,LEFT','ranking recebe a sequência real dos movimentos');
});

test('deslize reconhece as quatro direções sem mover a cobra antes do próximo passo', async () => {
  for (const [dir,dx,dy,initial] of [['UP',0,-45,'RIGHT'],['DOWN',0,45,'RIGHT'],['LEFT',-45,0,'UP'],['RIGHT',45,0,'UP']]) {
    const ui=setup(); await ui.element('start').click(); ui.advance(3000);
    ui.run(`state.dir='${initial}';state.nextDir='${initial}'`);
    pointer(ui,'board','pointerdown');
    const move=pointer(ui,'board','pointermove',{clientX:150+dx,clientY:150+dy});
    assert.equal(move.prevented,true);
    assert.equal(ui.run('directionQueue[0]'),dir);
    assert.equal(ui.run('state.snake[0].x'),200);
    assert.equal(ui.run('state.snake[0].y'),200);
    ui.advance(110);
    assert.equal(ui.run('state.dir'),dir);
  }
});

test('toques curtos, cancelados e de outro dedo não geram deslizes indevidos', async () => {
  const ui=setup(); await ui.element('start').click(); ui.advance(3000);
  pointer(ui,'board','pointerdown');
  pointer(ui,'board','pointermove',{clientY:145});
  pointer(ui,'board','pointermove',{pointerId:2,clientY:90});
  assert.equal(ui.run('directionQueue.length'),0);
  pointer(ui,'board','pointercancel');
  pointer(ui,'board','pointermove',{clientY:90});
  assert.equal(ui.run('directionQueue.length'),0);
  pointer(ui,'board','pointerdown');
  pointer(ui,'board','pointermove',{clientY:90});
  pointer(ui,'board','pointermove',{clientX:90,clientY:90});
  assert.equal(ui.run('directionQueue.join()'),'UP','cada gesto envia apenas uma direção');
});

test('direções preparadas na contagem entram em sequência e são limpas ao pausar ou reiniciar', async () => {
  const ui=setup(); await ui.element('start').click();
  pointer(ui,'board','pointerdown');
  pointer(ui,'board','pointermove',{clientY:90});
  pointer(ui,'dirLEFT','pointerdown');
  ui.advance(3000);
  assert.equal(ui.run('state.snake[0].y'),200);
  ui.advance(110);
  assert.equal(ui.run('state.dir'),'UP');
  ui.advance(110);
  assert.equal(ui.run('state.dir'),'LEFT');
  pointer(ui,'dirDOWN','pointerdown');
  ui.element('pause').click();
  assert.equal(ui.run('directionQueue.length'),0);
  pointer(ui,'dirRIGHT','pointerdown');
  assert.equal(ui.run('directionQueue.length'),0);
  await ui.element('restart').click();
  assert.equal(ui.run('directionQueue.length'),0);
});
