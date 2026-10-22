const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const box = 20;
let snake, food, dir, nextDir, score, game;
let pulse = 0;
let eatAnimation = 0;
let particles = [];

function startGame() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("gameArea").style.display = "block";
  restartGame();
}

function restartGame() {
  // Esconde a tela de Game Over
  document.getElementById("gameOverScreen").classList.add("hidden");

  // Reinicia as variáveis
  snake = [{ x: 200, y: 200 }];
  dir = "RIGHT";
  nextDir = "RIGHT";
  score = 0;
  particles = [];
  eatAnimation = 0;

  // Atualiza a interface
  document.getElementById("score").innerText = score;

  // Nova comida
  food = gerarComida();

  // Reinicia o loop do jogo
  clearInterval(game);
  game = setInterval(draw, 90);
}

function gameOver() {
  clearInterval(game);
  document.getElementById("finalScore").innerText = score;
  document.getElementById("gameOverScreen").classList.remove("hidden");
}

document.addEventListener("keydown", (e) => {
  if (e.key == "ArrowLeft") setDir("LEFT");
  if (e.key == "ArrowUp") setDir("UP");
  if (e.key == "ArrowRight") setDir("RIGHT");
  if (e.key == "ArrowDown") setDir("DOWN");
});

function setDir(d) {
  if (d == "LEFT" && dir != "RIGHT") nextDir = d;
  if (d == "RIGHT" && dir != "LEFT") nextDir = d;
  if (d == "UP" && dir != "DOWN") nextDir = d;
  if (d == "DOWN" && dir != "UP") nextDir = d;
}

function gerarComida() {
  let nova;

  do {
    nova = {
      x: Math.floor(Math.random() * 20) * box,
      y: Math.floor(Math.random() * 20) * box,
    };
  } while (snake.some((s) => s.x == nova.x && s.y == nova.y));
  return nova;
}

function draw() {
  pulse += 0.15;
  dir = nextDir;
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, 400, 400);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 400; i += box) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 400);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(400, i);
    ctx.stroke();
  }

  snake.forEach((p, i) => {
    ctx.fillStyle = i == 0 ? "#22c55e" : "#4ade80";

    let size = box - 2;
    let offset = 0;

    if (i == 0 && eatAnimation > 0) {
      size = 22;
      offset = -2;
    }

    if (i == 0) {
      ctx.beginPath();
      ctx.roundRect(p.x + offset, p.y + offset, size, size, 7);

      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, box - 2, box - 2, 5);
      ctx.fill();
    }

    if (i == 0) {
      let olho1 = { x: 5, y: 5 };
      let olho2 = { x: 12, y: 5 };

      if (dir == "LEFT") {
        olho1 = { x: 4, y: 4 };
        olho2 = { x: 4, y: 12 };
      }

      if (dir == "RIGHT") {
        olho1 = { x: 13, y: 4 };
        olho2 = { x: 13, y: 12 };
      }

      if (dir == "UP") {
        olho1 = { x: 4, y: 4 };
        olho2 = { x: 12, y: 4 };
      }

      if (dir == "DOWN") {
        olho1 = { x: 4, y: 13 };
        olho2 = { x: 12, y: 13 };
      }

      ctx.fillStyle = "white";
      ctx.fillRect(p.x + olho1.x, p.y + olho1.y, 3, 3);
      ctx.fillRect(p.x + olho2.x, p.y + olho2.y, 3, 3);
    }
  });

  const scale = 1 + Math.sin(pulse) * 0.08;

  // Corpo da maçã
  ctx.save();

  ctx.translate(food.x + 10, food.y + 10);
  ctx.scale(scale, scale);

  ctx.shadowColor = "#ef444";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#ef4444";

  ctx.beginPath();
  ctx.arc(-3, 0, 5, 0, Math.PI * 2);
  ctx.arc(3, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  // Parte inferior
  ctx.beginPath();
  ctx.moveTo(-8, 1);
  ctx.quadraticCurveTo(0, 10, 8, 1);
  ctx.fill();

  // Cabo
  ctx.strokeStyle = "#5b3a29";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(1, -10);
  ctx.stroke();

  // Folha
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.ellipse(5, -8, 4, 2, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();

  let head = { x: snake[0].x, y: snake[0].y };
  if (dir == "LEFT") head.x -= box;
  if (dir == "RIGHT") head.x += box;
  if (dir == "UP") head.y -= box;
  if (dir == "DOWN") head.y += box;

  // TELEPORTE = MÉTRICAS
  if (head.x < 0) head.x = 380;
  if (head.x > 380) head.x = 0;
  if (head.y < 0) head.y = 380;
  if (head.y > 380) head.y = 0;

  if (head.x == food.x && head.y == food.y) {
    score++;
    document.getElementById("score").innerText = score;
    eatAnimation = 6;
    criarParticulas(food.x, food.y);
    food = gerarComida();
  } else snake.pop();

  particles.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);

    ctx.fillStyle = `rgba(255,255,255,${p.life / 25})`;
    ctx.fill();

    p.x += p.dx;
    p.y += p.dy;
    p.life--;
  });

  if (eatAnimation > 0) {
    eatAnimation--;
  }

  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {});

  for (let i = 1; i < snake.length; i++) {
    if (head.x == snake[i].x && head.y == snake[i].y) {
      gameOver();
      return;
    }
  }
  snake.unshift(head);
}

function criarParticulas(x, y) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x + 10,
      y: y + 10,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,

      life: 25,
    });
  }
}
