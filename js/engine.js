/* Regras independentes da interface, compartilhadas pelo navegador e pelos testes. */
(function (root) {
  const SIZE = 20;
  const CELL = 20;
  const vectors = { LEFT: [-1, 0], RIGHT: [1, 0], UP: [0, -1], DOWN: [0, 1] };
  const opposite = { LEFT: 'RIGHT', RIGHT: 'LEFT', UP: 'DOWN', DOWN: 'UP' };
  const same = (a, b) => a.x === b.x && a.y === b.y;

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  }

  function createFood(snake, random = Math.random) {
    const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
    const free = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!occupied.has(`${x * CELL},${y * CELL}`)) free.push({ x: x * CELL, y: y * CELL });
      }
    }
    return free.length ? free[Math.floor(random() * free.length)] : null;
  }

  function createGame(random = Math.random) {
    const snake = [{ x: 200, y: 200 }];
    return { snake, food: createFood(snake, random), dir: 'RIGHT', nextDir: 'RIGHT', score: 0, status: 'running' };
  }

  function turn(state, direction) {
    if (state.status === 'running' && vectors[direction] && direction !== opposite[state.dir]) {
      state.nextDir = direction;
    }
  }

  function step(state, random = Math.random) {
    if (state.status !== 'running') return { ate: false };
    state.dir = state.nextDir;
    const [dx, dy] = vectors[state.dir];
    const edge = SIZE * CELL;
    const head = { x: state.snake[0].x + dx * CELL, y: state.snake[0].y + dy * CELL };
    if (head.x < 0 || head.x >= edge || head.y < 0 || head.y >= edge) {
      state.status = 'lost';
      state.reason = 'wall';
      return { ate: false };
    }
    const ate = state.food !== null && same(head, state.food);
    // A cauda sai da posição atual quando a cobra não está crescendo.
    const body = ate ? state.snake : state.snake.slice(0, -1);
    if (body.some(p => same(p, head))) {
      state.status = 'lost';
      state.reason = 'body';
      return { ate: false };
    }
    if (!ate) state.snake.pop();
    state.snake.unshift(head);
    if (ate) {
      state.score++;
      state.food = createFood(state.snake, random);
      if (!state.food) state.status = 'won';
    }
    return { ate, head };
  }

  const engine = { SIZE, CELL, createFood, createGame, turn, step, seededRandom };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  else root.SnakeEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
