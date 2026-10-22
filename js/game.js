const $ = id => document.getElementById(id);
const speeds = { easy: 150, normal: 110, hard: 75 };
const recordKey = difficulty => `cobrinha:walls-v2:record:${difficulty}`;
let state;
let timer;
let difficulty = 'normal';
let effects = { pulse: 0, eatAnimation: 0, particles: [] };
let record = 0;
let roundContext;
let starting = false;
let countdownTimer;
let startSequence = 0;
let directionQueue = [];
let swipeGesture = null;

function resetControls() {
  directionQueue = [];
  swipeGesture = null;
}

function queueDirection(direction) {
  if (starting || !state || !['running', 'countdown'].includes(state.status)) return;
  const opposite = { LEFT: 'RIGHT', RIGHT: 'LEFT', UP: 'DOWN', DOWN: 'UP' };
  const previous = directionQueue.at(-1) || state.nextDir;
  if (!opposite[direction] || direction === previous || direction === opposite[previous] || directionQueue.length >= 2) return;
  directionQueue.push(direction);
}

function cancelCountdown() {
  clearTimeout(countdownTimer);
  $('countdown').hidden = true;
}

function pauseGame() {
  resetControls();
  cancelCountdown();
  clearInterval(timer);
  state.status = 'paused';
  $('pause').textContent = 'Continuar';
  showOverlay('Jogo pausado', 'Quando estiver pronto, continuamos em 3, 2, 1.', 'Continuar');
}

function beginCountdown() {
  cancelCountdown();
  clearInterval(timer);
  if (document.hidden) { pauseGame(); return; }
  const currentGame = state;
  state.status = 'countdown';
  $('overlay').hidden = true;
  $('countdown').hidden = false;
  $('pause').textContent = 'Pausar';
  $('pause').focus({ preventScroll: true });
  $('game').scrollIntoView?.({ block: 'center', behavior: 'auto' });
  let remaining = 3;
  $('countdownNumber').textContent = remaining;
  function next() {
    if (state !== currentGame || state.status !== 'countdown') return;
    remaining--;
    if (remaining === 0) {
      $('countdown').hidden = true;
      state.status = 'running';
      timer = setInterval(tick, speeds[difficulty]);
      return;
    }
    $('countdownNumber').textContent = remaining;
    countdownTimer = setTimeout(next, 1000);
  }
  countdownTimer = setTimeout(next, 1000);
}

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

async function startGame() {
  if (starting) return;
  let profile;
  try { profile = typeof RankingClient !== 'undefined' ? RankingClient.profile($('nickname').value) : { nickname: 'Jogador' }; }
  catch (error) { $('profileError').textContent = error.message; $('nickname').focus(); return; }
  starting = true;
  const requestId = ++startSequence;
  $('start').disabled = true;
  $('start').textContent = 'Preparando…';
  clearInterval(timer);
  cancelCountdown();
  resetControls();
  if (state && ['running', 'countdown'].includes(state.status)) state.status = 'paused';
  difficulty = $('difficulty').value;
  const round = typeof RankingClient !== 'undefined' ? await RankingClient.startRound(difficulty) : null;
  if (requestId !== startSequence) return;
  if (typeof RankingClient !== 'undefined') RankingClient.begin(round);
  const random = round ? SnakeEngine.seededRandom(round.seed) : Math.random;
  roundContext = { round, profile, difficulty, random, moves: [] };
  record = readRecord();
  state = SnakeEngine.createGame(random);
  $('playerName').textContent = profile.nickname;
  $('profileError').textContent = '';
  $('saveStatus').textContent = round ? 'Partida conectada ao ranking' : 'Sem conexão com o ranking. Recorde salvo neste aparelho.';
  effects = { pulse: 0, eatAnimation: 0, particles: [] };
  $('menu').hidden = true;
  $('gameArea').hidden = false;
  $('overlay').hidden = true;
  $('pause').disabled = false;
  $('pause').textContent = 'Pausar';
  $('level').textContent = $('difficulty').selectedOptions[0].textContent;
  updateScore();
  renderGame(state, effects);
  beginCountdown();
  starting = false;
  $('start').disabled = false;
  $('start').textContent = 'Jogar';
}

function tick() {
  if (state?.status !== 'running') return;
  if (directionQueue.length) SnakeEngine.turn(state, directionQueue.shift());
  if (roundContext.moves.length <= 24000) roundContext.moves.push(state.nextDir);
  const result = SnakeEngine.step(state, roundContext.random);
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
    resetControls();
    clearInterval(timer);
    $('pause').disabled = true;
    showOverlay(state.status === 'won' ? 'Você venceu! 🏆' : state.reason === 'wall' ? 'Bateu na parede!' : 'Bateu na cobrinha!', `Pontuação: ${state.score}`, 'Jogar novamente');
    if (typeof RankingClient !== 'undefined') RankingClient.finish(roundContext, state.score);
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
  if (starting || !state || !['running', 'paused', 'countdown'].includes(state.status)) return;
  if (state.status === 'paused') beginCountdown();
  else pauseGame();
}

$('start').addEventListener('click', startGame);
$('restart').addEventListener('click', startGame);
$('pause').addEventListener('click', togglePause);
$('overlayAction').addEventListener('click', () => state.status === 'paused' ? togglePause() : startGame());
$('back').addEventListener('click', () => {
  startSequence++;
  starting = false;
  $('start').disabled = false;
  $('start').textContent = 'Jogar';
  cancelCountdown();
  resetControls();
  clearInterval(timer);
  state = null;
  $('gameArea').hidden = true;
  $('menu').hidden = false;
  $('start').focus();
});
document.querySelectorAll('[data-dir]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (event.button > 0) return;
    event.preventDefault();
    queueDirection(button.dataset.dir);
  });
  // O click continua disponível para teclado e leitores de tela.
  button.addEventListener('click', event => {
    if (event.detail === 0 || !('PointerEvent' in window)) queueDirection(button.dataset.dir);
  });
  button.addEventListener('contextmenu', event => event.preventDefault());
});
const board = $('board');
board.addEventListener('pointerdown', event => {
  if (event.button > 0 || starting || !state || !['running', 'countdown'].includes(state.status) || swipeGesture || event.target?.closest?.('button')) return;
  event.preventDefault();
  swipeGesture = { id: event.pointerId, x: event.clientX, y: event.clientY, threshold: Math.max(16, Math.min(28, board.clientWidth * 0.07)) };
  board.setPointerCapture?.(event.pointerId);
});
board.addEventListener('pointermove', event => {
  if (!swipeGesture || swipeGesture.id !== event.pointerId) return;
  const dx = event.clientX - swipeGesture.x;
  const dy = event.clientY - swipeGesture.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < swipeGesture.threshold) return;
  event.preventDefault();
  queueDirection(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
  swipeGesture = null;
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  board.addEventListener(eventName, event => { if (swipeGesture?.id === event.pointerId) swipeGesture = null; });
}
board.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', event => {
  if (!state || event.ctrlKey || event.altKey || event.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
  const keys = { ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', a: 'LEFT', d: 'RIGHT', w: 'UP', s: 'DOWN' };
  const direction = keys[event.key] || keys[event.key.toLowerCase()];
  if (direction) { event.preventDefault(); queueDirection(direction); }
  if ((event.code === 'Space' || event.key === 'Escape') && !event.repeat && ['running', 'paused', 'countdown'].includes(state.status)) {
    event.preventDefault();
    togglePause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ['running', 'countdown'].includes(state?.status)) pauseGame();
});
window.addEventListener('blur', () => { if (['running', 'countdown'].includes(state?.status)) pauseGame(); });
