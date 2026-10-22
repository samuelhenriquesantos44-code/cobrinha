const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup(blockStorage = false) {
  const elements = new Map();
  const events = {};
  const storage = new Map();
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
    renderGame() {}, setInterval: () => 1, clearInterval() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), context);
  return { context, element, events, storage, run: code => vm.runInContext(code, context) };
}

test('iniciar, pausar, continuar e reiniciar atualizam a interface', () => {
  const ui = setup();
  ui.element('start').click();
  assert.equal(ui.element('menu').hidden, true);
  assert.equal(ui.element('gameArea').hidden, false);
  ui.element('pause').click();
  assert.equal(ui.run('state.status'), 'paused');
  assert.equal(ui.element('overlay').hidden, false);
  ui.element('overlayAction').click();
  assert.equal(ui.run('state.status'), 'running');
  assert.equal(ui.element('overlay').hidden, true);
  ui.element('restart').click();
  assert.equal(ui.element('score').textContent, 0);
  ui.element('back').click();
  assert.equal(ui.element('gameArea').hidden, true);
  assert.equal(ui.element('menu').hidden, false);
});

test('troca de aba e janela pausa sem retomar automaticamente', () => {
  const ui = setup(); ui.element('start').click();
  ui.context.document.hidden = true;
  ui.events.visibilitychange();
  assert.equal(ui.run('state.status'), 'paused');
  ui.context.document.hidden = false;
  ui.events.visibilitychange();
  assert.equal(ui.run('state.status'), 'paused');
  ui.element('overlayAction').click();
  ui.events.blur();
  assert.equal(ui.run('state.status'), 'paused');
});

test('pontuação e recorde persistem por nível; armazenamento bloqueado não interrompe o jogo', () => {
  for (const blocked of [false, true]) {
    const ui = setup(blocked); ui.element('start').click();
    ui.run('state.food = {x:220,y:200}; tick();');
    assert.equal(ui.element('score').textContent, 1);
    assert.equal(ui.element('record').textContent, 1);
    if (!blocked) assert.equal(ui.storage.get('cobrinha:record:normal'), '1');
    ui.element('restart').click();
    assert.equal(ui.element('record').textContent, blocked ? 0 : 1);
    ui.element('difficulty').value = 'easy';
    ui.element('restart').click();
    assert.equal(ui.element('record').textContent, 0);
  }
});

test('setas bloqueiam rolagem e espaço alterna pausa', () => {
  const ui = setup(); ui.element('start').click();
  let prevented = 0;
  const key = (value, code) => ui.events.keydown({key:value, code, target:{tagName:'BUTTON'}, preventDefault() { prevented++; }});
  key('ArrowUp', 'ArrowUp');
  assert.equal(ui.run('state.nextDir'), 'UP');
  key(' ', 'Space');
  assert.equal(ui.run('state.status'), 'paused');
  key(' ', 'Space');
  assert.equal(ui.run('state.status'), 'running');
  assert.equal(prevented, 3);
  ui.run("state.status = 'lost'");
  key(' ', 'Space');
  assert.equal(prevented, 3, 'Espaço continua ativando o botão de jogar novamente ao perder');
});
