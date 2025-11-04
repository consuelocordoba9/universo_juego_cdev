// script.js
// Juego: colisionar la nave con los planetas indicados en la lista.
// - Organizado en un solo archivo JS sin librerías externas.
// - Comentarios explicativos incluidos.

/* ========= Configuración del juego ========= */
const CANVAS_ID = 'game';
const PLANET_NAMES = ['Mercurio','Venus','Tierra','Marte','Júpiter','Saturno','Urano','Neptuno'];
const TOTAL_PLANETS = PLANET_NAMES.length; // 8
const INITIAL_LIVES = 3;

// dimensiones físicas del mundo en coordenadas canvas
const WORLD_W = 960;
const WORLD_H = 540;

/* ========= Estado del juego ========= */
let canvas, ctx;
let ship = { x: WORLD_W/2, y: WORLD_H - 80, r: 12, vx: 0, vy: 0, speed: 2.2 };
let planets = []; // {x,y,r,name,done}
let currentIndex = 0; // index del objetivo actual en planets
let score = 0;
let lives = INITIAL_LIVES;
let gameOver = false;

/* cooldown para evitar múltiples colisiones inmediatas */
let collisionCooldown = 0;

/* ========= UI elements ======== */
const planetListEl = document.getElementById('planetList');
const counterEl = document.getElementById('counter');
const heartsEl = document.getElementById('hearts');
const overlay = document.getElementById('overlay');
const overlayContent = document.getElementById('overlayContent');

/* ====== Inicialización ====== */
function init() {
  canvas = document.getElementById(CANVAS_ID);
  ctx = canvas.getContext('2d');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;

  // crear planetas en posiciones fijas (para claridad)
  const margin = 120;
  const cols = 4;
  const rows = 2;
  const cellW = (WORLD_W - margin*2) / cols;
  const cellH = (WORLD_H - 160) / rows;

  let i = 0;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const cx = margin + c*cellW + cellW/2;
      const cy = 80 + r*cellH + cellH/2;
      const radius = 30 + (i%3)*6; // variación de tamaño
      planets.push({ x: cx, y: cy, r: radius, name: PLANET_NAMES[i], done: false });
      i++;
    }
  }

  // renderizar lista lateral
  renderPlanetList();

  // teclas
  setupInput();

  // bucle
  requestAnimationFrame(loop);
}

/* ====== Renderizar lista de objetivos (sidebar) ====== */
function renderPlanetList(){
  planetListEl.innerHTML = '';
  planets.forEach((p, idx) => {
    const li = document.createElement('li');
    li.textContent = p.name;
    if (p.done) li.classList.add('done');
    if (idx === currentIndex && !p.done) li.classList.add('target');
    li.dataset.idx = idx;
    planetListEl.appendChild(li);
  });
}

/* ====== Input (flechas / WASD) ====== */
const keys = {};
function setupInput(){
  window.addEventListener('keydown', (e)=>{ keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e)=>{ keys[e.key.toLowerCase()] = false; });
}

/* ====== Bucle principal ====== */
function loop(ts){
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ====== Update ====== */
function update(){
  if (gameOver) return;

  // movimiento simple con aceleración y fricción
  const acc = 0.18 * (keys['shift'] ? 1.6 : 1);
  if (keys['arrowleft'] || keys['a']) ship.vx -= acc;
  if (keys['arrowright'] || keys['d']) ship.vx += acc;
  if (keys['arrowup'] || keys['w']) ship.vy -= acc;
  if (keys['arrowdown'] || keys['s']) ship.vy += acc;

  // limit velocity
  ship.vx = clamp(ship.vx, -ship.speed, ship.speed);
  ship.vy = clamp(ship.vy, -ship.speed, ship.speed);

  // apply movement
  ship.x += ship.vx;
  ship.y += ship.vy;

  // simple drag so the ship slows when no input
  ship.vx *= 0.96;
  ship.vy *= 0.96;

  // keep inside canvas
  ship.x = clamp(ship.x, ship.r, canvas.width - ship.r);
  ship.y = clamp(ship.y, ship.r, canvas.height - ship.r);

  // collision cooldown timer
  if (collisionCooldown > 0) collisionCooldown -= 1;

  // check collisions with planets
  for (let i=0;i<planets.length;i++){
    const p = planets[i];
    if (p.done) continue; // ya chocado correctamente
    const dx = p.x - ship.x;
    const dy = p.y - ship.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < p.r + ship.r + 4 && collisionCooldown <= 0){
      handleCollision(i);
      collisionCooldown = 18; // evitar detección repetida por frames
      break; // procesar una por frame
    }
  }
}

/* ====== Manejo de colisiones ====== */
function handleCollision(idx){
  const p = planets[idx];
  // si es el objetivo actual -> acierto
  if (idx === currentIndex){
    p.done = true;
    score += 1;
    currentIndex = findNextIndex(currentIndex);
    updateCounter();
    renderPlanetList();
    // si completó todos -> victoria
    if (score >= TOTAL_PLANETS){
      showOverlay('¡VICTORY! Completaste los 8 planetas. Recargá la página para jugar de nuevo.');
      gameOver = true;
    }
  } else {
    // choque con planeta incorrecto -> pierde vida
    lives -= 1;
    updateHearts();
    // efecto visual: pequeño empuje hacia atrás
    ship.vx = - (p.x - ship.x) * 0.03;
    ship.vy = - (p.y - ship.y) * 0.03;
    if (lives <= 0){
      showOverlay('GAME OVER – Recargá la página para volver a intentar');
      gameOver = true;
    }
  }
}

/* encontrar siguiente índice objetivo (salta los ya completados) */
function findNextIndex(from){
  for (let i=from+1;i<planets.length;i++) if (!planets[i].done) return i;
  for (let i=0;i<from;i++) if (!planets[i].done) return i;
  return -1; // ninguno
}

/* ====== UI actualizaciones ====== */
function updateCounter(){ counterEl.textContent = `${score}/${TOTAL_PLANETS}`; }
function updateHearts(){
  const heartEls = heartsEl.querySelectorAll('.heart');
  heartEls.forEach((h, i)=>{
    if (i < lives) h.classList.add('filled'); else h.classList.remove('filled');
  });
}

/* ====== Dibujado ====== */
function draw(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // draw planets
  planets.forEach((p, idx)=>{
    // glow if is current target and not done
    if (idx === currentIndex && !p.done){
      // pulsing glow ring
      const alpha = 0.5 + 0.2*Math.sin(Date.now()/180);
      ctx.beginPath(); ctx.fillStyle = `rgba(255,255,150,${0.06 + 0.04*Math.sin(Date.now()/140)})`; ctx.ellipse(p.x, p.y, p.r+12, p.r+12, 0, 0, Math.PI*2); ctx.fill();
    }

    // planet body
    ctx.beginPath(); ctx.fillStyle = p.done ? '#555' : planetColor(idx); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    // outline
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
    // small label inside (muted)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.name.charAt(0), p.x, p.y);
  });

  // draw ship (triangle pointing up)
  drawShip();
}

function drawShip(){
  const x = ship.x, y = ship.y, r = ship.r;
  ctx.save();
  ctx.translate(x,y);
  // rotate based on velocity for slight banking
  const angle = Math.atan2(ship.vy, ship.vx) + Math.PI/2;
  ctx.rotate(angle);
  // body
  ctx.beginPath(); ctx.moveTo(0, -r*1.8); ctx.lineTo(r, r*1.6); ctx.lineTo(-r, r*1.6); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill();
  // cockpit
  ctx.beginPath(); ctx.arc(0, -r*0.6, r*0.5, 0, Math.PI*2); ctx.fillStyle = '#2b6cff'; ctx.fill();
  ctx.restore();
}

/* ====== Helpers ====== */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function planetColor(idx){
  const colors = ['#a79a7f','#f0d38a','#3ca0ff','#d45a4a','#d9b77a','#c99b6a','#9fd7e6','#6aa0d8'];
  return colors[idx % colors.length];
}

/* ====== Overlay (victory / game over) ====== */
function showOverlay(text){
  overlayContent.innerHTML = `<div>${text}</div><div class="muted" style="margin-top:10px;font-size:14px">Recargá la página para reiniciar</div>`;
  overlay.classList.remove('hidden');
}

/* ====== Arranque ====== */
window.addEventListener('load', ()=>{
  init();
  updateCounter();
  updateHearts();
});

/* ========== Comentarios y notas ==========
 - Controles: Flechas o WASD para mover la nave.
 - El objetivo actual aparece en la lista izquierda con efecto 'target' (CSS) y el planeta en el canvas tiene un halo brillante.
 - Al chocar con el planeta correcto se marca como completado, el contador aumenta y se pasa al siguiente.
 - Al chocar con un planeta incorrecto se pierde una vida. Al llegar a 0 vidas aparece GAME OVER.
 - No se usan librerías externas; todo el render es por canvas y DOM.
 =========================================*/
