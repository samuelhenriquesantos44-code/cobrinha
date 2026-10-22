const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
function renderGame(state, effects) {
  const {snake, food, dir} = state;
  const {pulse, eatAnimation, particles} = effects;
  const box = 20;
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

  if (food) {
  const scale = 1 + Math.sin(pulse) * 0.08;

  // Corpo da maçã
  ctx.save();

  ctx.translate(food.x + 10, food.y + 10);
  ctx.scale(scale, scale);

  ctx.shadowColor = "#ef4444";
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
  }

  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.life / 25})`;
    ctx.fill();
  }
}
