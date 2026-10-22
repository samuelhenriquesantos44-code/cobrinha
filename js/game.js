const $ = id => document.getElementById(id);
const speeds = { easy: 150, normal: 110, hard: 75 };
const recordKey = difficulty => `cobrinha:record:${difficulty}`;
let state;
let timer;
let difficulty = 'normal';
let effects = { pulse: 0, eatAnimation: 0, particles: [] };
let record = 0;

function readRecord() {
  try { return Math.max(0, Number(localStorage.getItem(recordKey(difficulty))) || 0); }
  catch { return 0; }
}

function updateScore() {
  $('score').textContent = state.score;
  if (state.score > record) {
    record = state.score;
    try { localStorage.setItem(recordKey(difficulty), String(record)); } catch { /* O jogo funciona sem armazenamento. */ }
  }
  $('record').textContent = record;
}

function startGame() {
  clearInterval(timer);
  difficulty = $('difficulty').value;
  record = readRecord();
  state = SnakeEngine.createGame();
  effects = { pulse: 0, eatAnimation: 0, particles: [] };
  $('menu').hidden = true;
  $('gameArea').hidden = false;
  $('overlay').hidden = true;
  $('pause').disabled = false;
  $('pause').textContent = 'Pausar';
  $('level').textContent = $('difficulty').selectedOptions[0].textContent;
  updateScore();
  renderGame(state, effects);
  $('pause').focus({ preventScroll: true });
  timer = setInterval(tick, speeds[difficulty]);
}

function tick() {
  if (state.status !== 'running') return;
  const result = SnakeEngine.step(state);
  effects.pulse += 0.15;
  effects.eatAnimation = Math.max(0, effects.eatAnimation - 1);
  effects.particles = effects.particles.filter(p => --p.life > 0);
  for (const p of effects.particles) { p.x += p.dx; p.y += p.dy; }
  if (result.ate) {
    effects.eatAnimation = 6;
    for (let i = 0; i < 12; i++) {
      effects.particles.push({ x: result.head.x + 10, y: result.head.y + 10, dx: (Math.random() - .5) * 4, dy: (Math.random() - .5) * 4, life: 25 });
    }
    updateScore();
  }
  renderGame(state, effects);
  if (state.status === 'won' || state.status === 'lost') {
    clearInterval(timer);
    $('pause').disabled = true;
    showOverlay(state.status === 'won' ? 'Você venceu! 🏆' : 'Fim de jogo', `Pontuação: ${state.score}`, 'Jogar novamente');
  }
}

function showOverlay(title, text, action) {
  $('overlayTitle').textContent = title;
  $('overlayText').textContent = text;
  $('overlayAction').textContent = action;
  $('overlay').hidden = false;
  $('overlayAction').focus({ preventScroll: true });
}

function togglePause() {
  if (!state || !['running', 'paused'].includes(state.status)) return;
  if (state.status === 'running') {
    state.status = 'paused';
    $('pause').textContent = 'Continuar';
    showOverlay('Jogo pausado', 'Respire. Sua partida está aqui.', 'Continuar');
  } else {
    state.status = 'running';
    $('pause').textContent = 'Pausar';
    $('overlay').hidden = true;
    $('pause').focus({ preventScroll: true });
  }
}

$('start').addEventListener('click', startGame);
$('restart').addEventListener('click', startGame);
$('pause').addEventListener('click', togglePause);
$('overlayAction').addEventListener('click', () => state.status === 'paused' ? togglePause() : startGame());
$('back').addEventListener('click', () => {
  clearInterval(timer);
  state = null;
  $('gameArea').hidden = true;
  $('menu').hidden = false;
  $('start').focus();
});
document.querySelectorAll('[data-dir]').forEach(button => {
  button.addEventListener('click', () => { if (state) SnakeEngine.turn(state, button.dataset.dir); });
});
document.addEventListener('keydown', event => {
  if (!state || event.ctrlKey || event.altKey || event.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  const keys = { ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', a: 'LEFT', d: 'RIGHT', w: 'UP', s: 'DOWN' };
  const direction = keys[event.key] || keys[event.key.toLowerCase()];
  if (direction) { event.preventDefault(); SnakeEngine.turn(state, direction); }
  if ((event.code === 'Space' || event.key === 'Escape') && !event.repeat && ['running', 'paused'].includes(state.status)) {
    event.preventDefault();
    togglePause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state?.status === 'running') togglePause();
});
window.addEventListener('blur', () => { if (state?.status === 'running') togglePause(); });
