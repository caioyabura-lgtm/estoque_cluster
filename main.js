const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

let w = window.innerWidth;
let h = window.innerHeight;
let mouseX = w / 2;
let mouseY = h / 2;

canvas.width = w;
canvas.height = h;
canvas.style.position = 'fixed';
canvas.style.inset = '0';
canvas.style.zIndex = '0';
canvas.style.pointerEvents = 'none';

const threads = Array.from({ length: 18 }, () => ({
  x: Math.random() * w,
  y: Math.random() * h,
  amplitude: 18 + Math.random() * 38,
  phase: Math.random() * Math.PI * 2,
  speed: 0.012 + Math.random() * 0.018,
  thickness: 1 + Math.random() * 1.4
}));

window.addEventListener('mousemove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
});

window.addEventListener('resize', () => {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
});

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#F7EFE0');
  gradient.addColorStop(0.5, '#F2E4D1');
  gradient.addColorStop(1, '#DDD0BF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 220);
  glow.addColorStop(0, 'rgba(184, 107, 75, 0.22)');
  glow.addColorStop(1, 'rgba(184, 107, 75, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawThreads() {
  ctx.save();
  ctx.strokeStyle = 'rgba(106, 75, 58, 0.16)';
  ctx.lineWidth = 1;

  threads.forEach((thread) => {
    const offset = Math.sin(Date.now() * thread.speed + thread.phase) * thread.amplitude;
    ctx.beginPath();
    ctx.moveTo(thread.x, thread.y);
    ctx.quadraticCurveTo(thread.x + offset, thread.y + 70, thread.x + offset * 0.5, thread.y + 140);
    ctx.stroke();
  });

  ctx.restore();
}

function drawAccents() {
  ctx.save();
  ctx.fillStyle = 'rgba(198, 155, 60, 0.18)';
  ctx.beginPath();
  ctx.arc(w * 0.8, h * 0.16, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(110, 124, 90, 0.12)';
  ctx.beginPath();
  ctx.arc(w * 0.15, h * 0.75, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function animate() {
  ctx.clearRect(0, 0, w, h);
  drawBackground();
  drawAccents();
  drawThreads();
  requestAnimationFrame(animate);
}

animate();
