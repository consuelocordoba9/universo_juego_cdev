import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
import { loadInto, setScaleOnParent, setPositionOnParent, disposeCurrent, setRotationOnParent } from './src/ship/shipManager.js';
import { getPresetForUrl } from './src/ship/shipConfig.js';
// ====== ESCENA, CÁMARA Y RENDER ======
const scene = new THREE.Scene();

// background video element (if present) — used to pause/play on collision
const bgVideo = typeof document !== 'undefined' ? document.getElementById('bgVideo') : null;

const camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.set(0, 1, 10);

// Create a transparent WebGL canvas so a DOM video can show behind it
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// make sure the canvas clears to transparent
renderer.setClearColor(0x000000, 0);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
// ensure the WebGL canvas is above the background video
renderer.domElement.style.position = 'relative';
renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

// ====== LUCES ======
const ambient = new THREE.AmbientLight(0x404040, 2);
const point = new THREE.PointLight(0xffffff, 2);
point.position.set(0, 10, 10);
scene.add(ambient, point);

// ====== FONDO DE ESTRELLAS ======
function createStars() {
	const geo = new THREE.BufferGeometry();
	const count = 5000;
	const pos = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		pos[i * 3] = (Math.random() - 0.5) * 1000;
		pos[i * 3 + 1] = (Math.random() - 0.5) * 1000;
		pos[i * 3 + 2] = -Math.random() * 1000;
		const c = new THREE.Color();
		c.setHSL(Math.random(), 0.2, Math.random() * 0.8 + 0.2);
		colors[i * 3] = c.r;
		colors[i * 3 + 1] = c.g;
		colors[i * 3 + 2] = c.b;
	}
	geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	const mat = new THREE.PointsMaterial({
		size: 1.4,
		vertexColors: true,
		transparent: true,
	});
	scene.add(new THREE.Points(geo, mat));
}
// removed createStars() so the DOM background video is visible behind the scene

// ====== COHETE ======
// Reemplazamos la nave procedural por un grupo vacío: la nave real se cargará desde
// los modelos seleccionados en el menú y se añadirá como hijo de `rocket`.
const rocket = new THREE.Group();
scene.add(rocket);
rocket.rotation.x = Math.PI / 2;
rocket.position.set(0, 0, 0);

// Player collider: un objeto simple (esfera) que servirá como punto/volumen de colisión.
// Se añade como hijo de `rocket` para que siga su posición. Puedes ocultarlo
// llamando a `setPlayerColliderVisible(false)` desde la consola o desde otras partes.
const playerCollider = new THREE.Mesh(
	new THREE.SphereGeometry(0.6, 12, 12),
	new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, visible: true })
);
playerCollider.name = 'playerCollider';
playerCollider.position.set(0, 0, 0);
rocket.add(playerCollider);

// Global flag to toggle player hitbox visibility. Change this to true/false
// or call `setShowPlayerHitbox(true|false)` at runtime.
let showPlayerHitbox = false;
function setShowPlayerHitbox(v) {
	showPlayerHitbox = !!v;
	try { const col = rocket.getObjectByName('playerCollider'); if (col) col.visible = showPlayerHitbox; } catch(e) {}
}
window.setShowPlayerHitbox = setShowPlayerHitbox;
// apply initial value
setShowPlayerHitbox(showPlayerHitbox);

// ====== EFECTOS DE MOVIMIENTO (flama, luz y partículas) ======
// Engine flame removed per user request. No particle exhaust is emitted.

// banking/roll state
let targetRoll = 0;
let currentRoll = 0;
const ROLL_LERP = 0.12;

// delta time tracking for particle updates
let lastTime = performance && performance.now ? performance.now() : Date.now();

// Función para alternar visibilidad del collider (expuesta globalmente)
function setPlayerColliderVisible(visible) {
	playerCollider.visible = !!visible;
	// keep the global flag in sync
	showPlayerHitbox = !!visible;
}
window.setPlayerColliderVisible = setPlayerColliderVisible;
// Flag para habilitar/deshabilitar la participación del collider en la detección de colisiones
let playerColliderEnabled = true;
function setPlayerColliderEnabled(enabled) {
	playerColliderEnabled = !!enabled;
}
window.setPlayerColliderEnabled = setPlayerColliderEnabled;

// === Pantalla de inicio (menu) ===
function setupStartMenu() {
	const menu = document.getElementById('startMenu');
	const select = document.getElementById('shipSelectStart');
	const startBtn = document.getElementById('startGameBtn');
	const cancelBtn = document.getElementById('cancelStartBtn');
	const startInfo = document.getElementById('startInfo');
	const backToMenuBtn = document.getElementById('backToMenuBtn');

	if (!menu || !select) return;

	// Wire the external "back to menu" button (hidden until game starts)
	if (backToMenuBtn) {
		backToMenuBtn.style.display = 'none';
		backToMenuBtn.addEventListener('click', () => {
			// If a collision resume timeout is pending, cancel it so the game won't
			// automatically resume while the menu is shown.
			try {
				if (collisionTimeoutId !== null) {
					clearTimeout(collisionTimeoutId);
					collisionTimeoutId = null;
				}
				// also make sure collisionCooldown is cleared so the menu state is stable
				collisionCooldown = false;
			} catch (err) {}
			menu.style.display = 'flex';
			// pause the game when returning to the menu
			try { gamePaused = true; } catch (e) {}
			backToMenuBtn.style.display = 'none';
		});
		// expose a helper to show the start menu from other code
		window.showStartMenu = () => {
			menu.style.display = 'flex';
			try { gamePaused = true; } catch (e) {}
			backToMenuBtn.style.display = 'none';
		};
	}

		// --- Preview image (static) ---
		const previewImage = document.getElementById('previewImage');

		// Game speed UI
		const speedRange = document.getElementById('gameSpeedRange');
		const speedValue = document.getElementById('gameSpeedValue');
		if (speedRange) {
			globalGameSpeed = parseFloat(speedRange.value) || 1;
			if (speedValue) speedValue.textContent = globalGameSpeed.toFixed(1);
			speedRange.addEventListener('input', (e) => {
				const v = parseFloat(e.target.value) || 1;
				globalGameSpeed = v;
				if (speedValue) speedValue.textContent = v.toFixed(1);
			});
		}
		// The preview will now show a static image instead of a mini 3D canvas.
		// Place images at: assets/models/previews/<modelFileNameWithoutExt>.png (e.g. ship1.png)

		function getPreviewCandidates(url) {
			const parts = url.split('/');
			const name = parts[parts.length - 1] || '';
			const base = name.replace(/\.glb$/i, '').replace(/\.gltf$/i, '').replace(/\s+/g, '_');
			// candidate paths (try multiple locations / extensions)
			// also try an alternative naming like 'ship_1' if originals use underscores
			const underscored = base.replace(/([a-zA-Z]+)(\d+)$/, '$1_$2');
			return [
				`assets/models/previews/${base}.png`,
				`assets/models/previews/${base}.jpg`,
				`assets/models/previews/${base}.jpeg`,
				`assets/models/previews/${underscored}.png`,
				`assets/models/previews/${underscored}.jpg`,
				`assets/models/previews/game/${base}.png`,
				`assets/models/previews/game/${base}.jpg`,
				`assets/models/previews/game/${underscored}.png`,
				`assets/models/previews/placeholder.png`
			];
		}

		function setPreviewImage(url) {
			if (!previewImage) return;
			const candidates = getPreviewCandidates(url);
			let idx = 0;
			previewImage.onerror = function () {
				idx++;
				if (idx < candidates.length) {
					previewImage.src = candidates[idx];
				} else {
					// give up and clear handler
					previewImage.onerror = null;
				}
			};
			previewImage.src = candidates[0];
		}

		async function preview(url) {
			try {
				if (startInfo) { startInfo.style.display = 'block'; startInfo.textContent = 'Previsualizando...'; }
				const preset = getPresetForUrl(url);
				// Instead of loading a 3D preview, show a static preview image.
				try {
					setPreviewImage(url);
				} catch (e) {
					console.warn('No se pudo establecer la imagen de previsualización:', e);
				}
				if (startInfo) { startInfo.textContent = 'Previsualización lista'; setTimeout(() => startInfo.style.display = 'none', 800); }
			} catch (err) {
				console.error('Error previsualizando nave:', err);
				if (startInfo) { startInfo.textContent = 'Error al previsualizar (ver consola)'; setTimeout(() => startInfo.style.display = 'none', 1600); }
			}
		}

		// Preview when selection changes. Keep the menu paused while previewing.
		select.addEventListener('change', (e) => {
			preview(e.target.value);
			try { if (menu) { menu.style.display = 'flex'; gamePaused = true; } } catch (er) {}
		});

		// initial preview for selected ship (apply preset) and ensure menu stays open/paused
		preview(select.value);
		try { if (menu) { menu.style.display = 'flex'; gamePaused = true; } } catch (er) {}

	startBtn.addEventListener('click', async () => {
		// reset the game (so confirming restarts everything)
		try { resetGame(); } catch (e) { console.warn('resetGame error', e); }
		const url = select.value;
		const preset = getPresetForUrl(url);
		try {
			// ensure no previous ship remains
			disposeCurrent(rocket);
			await loadInto(rocket, url);
			// apply preset to main rocket
			setScaleOnParent(rocket, preset.scale);
			// position the loaded ship (child) relative to the rocket parent so the collider stays at origin
			try { setPositionOnParent(rocket, ...(preset.position || [0,0,0])); } catch(e) {}
			try { setRotationOnParent(rocket, ...(preset.rotation || [0,0,0])); } catch(e) {}
			// set collider radius for this ship
			try {
				const radius = preset.colliderRadius || 0.45;
				const col = rocket.getObjectByName('playerCollider');
				if (col) { col.geometry.dispose(); col.geometry = new THREE.SphereGeometry(radius, 12, 12); }
			} catch (e) {}
			// ensure collider visibility matches the global flag after loading
			try { const col = rocket.getObjectByName('playerCollider'); if (col) col.visible = !!showPlayerHitbox; } catch(e) {}
			// manage rotating objects
			clearRotatingObjects();
			if (preset.autoRotate) {
				const o = rocket.getObjectByName('loadedShip');
				if (o) rotatingObjects.push(o);
			}
		} catch (err) {
			console.error('Error cargando nave al comenzar:', err);
		}
		menu.style.display = 'none';
		gamePaused = false; // start game loop
		try { if (backToMenuBtn) backToMenuBtn.style.display = 'block'; } catch(e) {}
	});

	cancelBtn.addEventListener('click', () => {
		menu.style.display = 'none';
		gamePaused = false; // start game loop without changes
		try { if (backToMenuBtn) backToMenuBtn.style.display = 'block'; } catch(e) {}
	});
}

// initialize menu when DOM ready
window.addEventListener('DOMContentLoaded', setupStartMenu);
window.addEventListener('DOMContentLoaded', () => {
	try { setupGameUI(); } catch(e) { console.warn('setupGameUI failed', e); }
});

// rotating objects in-game (used when a preset wants autoRotate)
const rotatingObjects = [];

function clearRotatingObjects() {
	rotatingObjects.length = 0;
}

// ====== PLANETAS ======
const planetData = [
	{
		name: "Mercurio",
		size: 0.5,
		texture: "./textures/mercury.jpg",
		info: "Mercurio es el planeta más cercano al Sol y el más pequeño del sistema solar. Su superficie está cubierta de cráteres y sus temperaturas oscilan entre extremos de calor y frío.",
	},
	{
		name: "Venus",
		size: 0.8,
		texture: "./textures/venus.jpg",
		info: "Venus es el planeta más caliente del sistema solar debido a su densa atmósfera de dióxido de carbono. A veces se le llama el 'gemelo de la Tierra' por su tamaño similar.",
	},
	{
		name: "Tierra",
		size: 0.9,
		texture: "./textures/earth.jpg",
		info: "La Tierra es nuestro hogar, el único planeta conocido que alberga vida. Tiene océanos, atmósfera rica en oxígeno y una temperatura perfecta para los seres vivos.",
	},
	{
		name: "Marte",
		size: 0.7,
		texture: "./textures/mars.jpg",
		info: "Marte, el planeta rojo, tiene una atmósfera delgada y polvo de óxido de hierro en su superficie. Es el objetivo principal de misiones de exploración espacial.",
	},
	{
		name: "Júpiter",
		size: 1.2,
		texture: "./textures/jupiter.jpg",
		info: "Júpiter es el planeta más grande del sistema solar y un gigante gaseoso. Su Gran Mancha Roja es una tormenta que ha durado siglos, y tiene más de 79 lunas conocidas.",
	},
	{
		name: "Saturno",
		size: 1.0,
		texture: "./textures/saturn.jpg",
		info: "Saturno es famoso por sus impresionantes anillos compuestos de hielo y roca. Es el segundo planeta más grande y también un gigante gaseoso.",
	},
	{
		name: "Urano",
		size: 0.8,
		texture: "./textures/uranus.jpg",
		info: "Urano es único porque gira de lado, probablemente debido a una antigua colisión. Es un gigante de hielo con una atmósfera fría y ventosa.",
	},
	{
		name: "Neptuno",
		size: 0.7,
		texture: "./textures/neptune.jpg",
		info: "Neptuno es el planeta más lejano del Sol y tiene los vientos más rápidos del sistema solar. Su color azul intenso proviene del metano en su atmósfera.",
	},
];

const planets = [];
// helper: create a simple atmosphere (slightly larger transparent sphere)
function createAtmosphere(radius, color, opacity) {
	const geo = new THREE.SphereGeometry(radius * 1.02, 32, 32);
	const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, side: THREE.DoubleSide });
	return new THREE.Mesh(geo, mat);
}

// labels removed: planet name sprites disabled per user request

planetData.forEach((d, idx) => {
	const tex = new THREE.TextureLoader().load(d.texture);
	const p = new THREE.Mesh(
		new THREE.SphereGeometry(d.size, 32, 32),
		new THREE.MeshStandardMaterial({ map: tex })
	);
	// default rotation speed and slight variance per planet
	p.userData = Object.assign({}, d, { rotationSpeed: 0.01 + (idx * 0.002) });
	// position and add
	resetPlanet(p);
	scene.add(p);

	// distinctive features by name
	try {
		const name = (d.name || '').toLowerCase();
		if (name.includes('venus')) {
			// thick yellowish atmosphere
			const atm = createAtmosphere(d.size, 0xffe5c6, 0.12);
			p.add(atm);
		} else if (name.includes('tierra') || name.includes('earth')) {
			// thin white cloud layer
			const clouds = createAtmosphere(d.size, 0xffffff, 0.12);
			p.add(clouds);
		} else if (name.includes('marte') || name.includes('mars')) {
			// reddish tint via emissive
			if (p.material && (p.material.isMeshStandardMaterial || p.material.isMeshPhysicalMaterial)) {
				p.material.emissive = p.material.emissive || new THREE.Color(0x000000);
				p.material.emissive.add(new THREE.Color(0x220000));
				p.material.emissiveIntensity = (p.material.emissiveIntensity || 0) + 0.15;
			}
		} else if (name.includes('júpiter') || name.includes('jupiter')) {
			// add a subtle band overlay using a canvas texture to mimic stripes
			const w = 1024, h = 512;
			const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d');
			// fill base with the planet texture sampling (fallback color)
			cx.fillStyle = '#d9c9a6'; cx.fillRect(0,0,w,h);
			// draw horizontal bands
			for (let i=0;i<12;i++){
				const y = (i/w)*h*0.8 + (Math.random()-0.5)*6;
				cx.fillStyle = `rgba(${120+Math.floor(Math.random()*60)}, ${80+Math.floor(Math.random()*60)}, ${50+Math.floor(Math.random()*80)}, ${0.6 - Math.random()*0.25})`;
				cx.fillRect(0, y, w, 24 + Math.random()*12);
			}
			const stripesTex = new THREE.CanvasTexture(c);
			stripesTex.wrapS = stripesTex.wrapT = THREE.RepeatWrapping;
			if (p.material) p.material.map = p.material.map || stripesTex;
			// increase size slightly
			p.scale.setScalar(1.02);
		} else if (name.includes('saturno') || name.includes('saturn')) {
			// add rings
			const inner = d.size * 1.15;
			const outer = d.size * 2.2;
			const ringGeo = new THREE.RingGeometry(inner, outer, 64);
			const ringMat = new THREE.MeshStandardMaterial({ color: 0xCDBA88, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
			const ring = new THREE.Mesh(ringGeo, ringMat);
			ring.rotation.x = Math.PI / 2 - 0.2;
			ring.position.set(0,0,0);
			p.add(ring);
		} else if (name.includes('urano') || name.includes('urani') || name.includes('uranus')) {
			// tilt the planet (girar de lado)
			p.rotation.x = Math.PI / 2;
			p.userData.rotationSpeed *= 0.6;
		} else if (name.includes('neptuno') || name.includes('neptune')) {
			// bluish glow via emissive
			if (p.material && (p.material.isMeshStandardMaterial || p.material.isMeshPhysicalMaterial)) {
				p.material.emissive = p.material.emissive || new THREE.Color(0x000000);
				p.material.emissive.add(new THREE.Color(0x002244));
				p.material.emissiveIntensity = (p.material.emissiveIntensity || 0) + 0.25;
			}
		}
	} catch (e) {}

	// planet name labels disabled

	planets.push(p);
});

// ====== Objetivos / puntuación / vidas ======
const TOTAL_TARGETS = planetData.length || 8;
let currentTargetIndex = 0; // index in planets[] of the current target
let score = 0;
let lives = 3; // three hearts

// DOM bindings (populated on DOMContentLoaded)
let targetListEl = null;
let progressCounterEl = null;
let livesEls = null;
// randomized target order (array of planet indices) and pointer
let targetOrder = null;
let currentTargetPos = 0; // position inside targetOrder

function shuffleArray(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function setupGameUI() {
	targetListEl = document.getElementById('targetList');
	progressCounterEl = document.getElementById('progressCounter');
	livesEls = Array.from(document.querySelectorAll('#livesWrap .life'));
	// mark all planets as not done at start
	for (const p of planets) { p.userData.done = false; p.userData.isTarget = false; }
	// create a randomized target order and pick the first available
	targetOrder = shuffleArray(planets.map((_, i) => i));
	currentTargetPos = 0;
	currentTargetIndex = (targetOrder && targetOrder.length) ? targetOrder[currentTargetPos] : -1;
	markTarget(currentTargetIndex);
	renderTargetList();
	updateHUD();
}

function renderTargetList() {
	if (!targetListEl) return;
	targetListEl.innerHTML = '';
	// Render according to randomized targetOrder so the sidebar shows the sequence
	const order = (targetOrder && targetOrder.length) ? targetOrder : planets.map((_,i)=>i);
	order.forEach((planetIdx, displayPos) => {
		const p = planets[planetIdx];
		const li = document.createElement('li');
		li.textContent = p.userData && p.userData.name ? p.userData.name : `Planeta ${planetIdx+1}`;
		li.style.padding = '8px 10px';
		li.style.borderRadius = '6px';
		li.style.marginBottom = '8px';
		li.style.background = 'rgba(255,255,255,0.02)';
		li.style.color = '#fff';
		if (p.userData.done) {
			li.classList.add('done');
			li.style.opacity = '0.35';
			li.style.textDecoration = 'line-through';
			li.style.fontWeight = '400';
		}
		const currentIdx = (targetOrder && targetOrder.length) ? targetOrder[currentTargetPos] : currentTargetIndex;
		if (planetIdx === currentIdx && !p.userData.done) {
			li.classList.add('target');
			li.style.boxShadow = '0 0 14px rgba(255,255,140,0.14)';
			li.style.border = '1px solid rgba(255,255,160,0.10)';
			li.style.fontWeight = '700';
		}
		targetListEl.appendChild(li);
	});
}

function updateHUD() {
	try { if (progressCounterEl) progressCounterEl.textContent = `${score}/${TOTAL_TARGETS}`; } catch(e){}
	if (livesEls && livesEls.length) {
		livesEls.forEach((el, i) => {
			if (i < lives) el.style.opacity = '1'; else el.style.opacity = '0.18';
		});
	}
}

function findNextTarget(fromIdx) {
	// If we have a randomized order, find the next not-done planet in that order
	if (targetOrder && targetOrder.length) {
		// determine pos in order for fromIdx; if fromIdx < 0 use currentTargetPos
		let startPos = 0;
		if (fromIdx >= 0) {
			const pos = targetOrder.indexOf(fromIdx);
			startPos = (pos >= 0) ? pos : currentTargetPos;
		} else {
			startPos = currentTargetPos;
		}
		// search forward
		const n = targetOrder.length;
		for (let k = 1; k <= n; k++) {
			const testPos = (startPos + k) % n;
			const planetIdx = targetOrder[testPos];
			if (!planets[planetIdx].userData.done) {
				// update currentTargetPos
				currentTargetPos = testPos;
				return planetIdx;
			}
		}
		return -1;
	}
	// fallback: linear search
	for (let i = fromIdx + 1; i < planets.length; i++) if (!planets[i].userData.done) return i;
	for (let i = 0; i <= fromIdx; i++) if (!planets[i].userData.done) return i;
	return -1;
}

function markTarget(idx) {
	// clear existing
	for (let i=0;i<planets.length;i++) { planets[i].userData.isTarget = false; }
	if (idx >=0 && planets[idx]) planets[idx].userData.isTarget = true;
}

// ===== Particle emitter for target highlight =====
function ensureParticleEmitter(planet) {
	if (!planet || planet.userData && planet.userData.particleSystem) return;
	try {
		const baseR = (planet.geometry && planet.geometry.parameters && planet.geometry.parameters.radius) ? planet.geometry.parameters.radius : (planet.userData && planet.userData.size) || 1.0;
		const count = Math.max(40, Math.floor(baseR * 60));
		const positions = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			// random point on spherical shell around the planet
			const u = Math.random();
			const v = Math.random();
			const theta = 2 * Math.PI * u;
			const phi = Math.acos(2 * v - 1);
			// radius a bit larger than planet
			const r = baseR * (1.25 + Math.random() * 0.5);
			const x = r * Math.sin(phi) * Math.cos(theta);
			const y = r * Math.sin(phi) * Math.sin(theta);
			const z = r * Math.cos(phi);
			positions[i*3] = x;
			positions[i*3+1] = y;
			positions[i*3+2] = z;
		}
		const geom = new THREE.BufferGeometry();
		geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		const mat = new THREE.PointsMaterial({ color: 0xfff0aa, size: baseR * 0.08, transparent: true, opacity: 0.95, depthWrite: false });
		const pts = new THREE.Points(geom, mat);
		pts.name = 'targetParticles';
		pts.frustumCulled = false;
		planet.add(pts);
		if (!planet.userData) planet.userData = {};
		planet.userData.particleSystem = pts;
	} catch (e) { console.warn('create particle emitter failed', e); }
}

// ===== Explosion effect for wrong planet collision =====
function explodePlanet(planet) {
	if (!planet) return;
	try {
		const baseR = (planet.geometry && planet.geometry.parameters && planet.geometry.parameters.radius) ? planet.geometry.parameters.radius : (planet.userData && planet.userData.size) || 1.0;
		const particleCount = Math.max(60, Math.floor(baseR * 100));
		const positions = new Float32Array(particleCount * 3);
		const velocities = [];
		
		// Create explosion particles at planet center
		const pPos = new THREE.Vector3();
		planet.getWorldPosition(pPos);
		
		for (let i = 0; i < particleCount; i++) {
			positions[i*3] = pPos.x;
			positions[i*3+1] = pPos.y;
			positions[i*3+2] = pPos.z;
			// random outward velocity
			const speed = 0.8 + Math.random() * 1.2;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			velocities.push({
				x: speed * Math.sin(phi) * Math.cos(theta),
				y: speed * Math.sin(phi) * Math.sin(theta),
				z: speed * Math.cos(phi)
			});
		}
		
		const geom = new THREE.BufferGeometry();
		const posAttr = new THREE.BufferAttribute(positions, 3);
		posAttr.setUsage(THREE.DynamicDrawUsage);
		geom.setAttribute('position', posAttr);
		const mat = new THREE.PointsMaterial({ 
			color: 0xff6633, 
			size: baseR * 0.12, 
			transparent: true, 
			opacity: 1.0, 
			depthWrite: false 
		});
		const explosion = new THREE.Points(geom, mat);
		explosion.name = 'explosionEffect';
		scene.add(explosion);
		
		// Animate explosion (expand and fade out over 1 second)
		const startTime = performance.now();
		const duration = 1000; // 1 second
		
		function animateExplosion() {
			const now = performance.now();
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			
			if (progress < 1) {
				// Update particle positions
				const pos = explosion.geometry.attributes.position.array;
				for (let i = 0; i < particleCount; i++) {
					pos[i*3] += velocities[i].x * 0.08;
					pos[i*3+1] += velocities[i].y * 0.08;
					pos[i*3+2] += velocities[i].z * 0.08;
				}
				explosion.geometry.attributes.position.needsUpdate = true;
				
				// Fade out
				explosion.material.opacity = 1.0 - progress;
				explosion.material.size = baseR * (0.12 + progress * 0.08);
				
				requestAnimationFrame(animateExplosion);
			} else {
				// Remove explosion after animation
				try {
					scene.remove(explosion);
					explosion.geometry.dispose();
					explosion.material.dispose();
				} catch(e) {}
			}
		}
		animateExplosion();
		
		// Hide the planet temporarily during explosion
		planet.visible = false;
		
	} catch (e) { console.warn('explodePlanet failed', e); }
}

function showEndMessage(text) {
	// Show the new centered overlay with restart and reload options
	try {
		const endOverlay = document.getElementById('endOverlay');
		const endTitle = document.getElementById('endTitle');
		const endMessage = document.getElementById('endMessage');
		const restartBtn = document.getElementById('restartBtn');
		const reloadBtn = document.getElementById('reloadBtn');
		if (endTitle) endTitle.textContent = (text && text.toUpperCase()) || 'FIN';
		if (endMessage) endMessage.textContent = '';
		if (endOverlay) endOverlay.style.display = 'flex';
		// pause gameplay
		gamePaused = true;

		// restart button: hide overlay, reset game, and show ship selection menu
		if (restartBtn) {
			restartBtn.onclick = () => {
				try { endOverlay.style.display = 'none'; } catch(e){}
				try { resetGame(); } catch(e) { console.warn('resetGame failed', e); }
				// show the start menu instead of resuming directly
				try {
					const startMenu = document.getElementById('startMenu');
					if (startMenu) startMenu.style.display = 'flex';
					gamePaused = true; // keep paused until user selects ship
				} catch(e) { console.warn('Failed to show start menu', e); }
			};
		}
		// reload button: reload the page
		if (reloadBtn) {
			reloadBtn.onclick = () => { try { location.reload(); } catch(e) { console.warn(e); } };
		}
	} catch (e) { console.warn('showEndMessage failed', e); }
}


function resetPlanet(p) {
	p.position.x = (Math.random() - 0.5) * 10;
	p.position.y = (Math.random() - 0.5) * 6;
	p.position.z = -Math.random() * 100 - 20;
}

// ====== CARTEL SUPERIOR ======
const infoBox = document.createElement("div");
infoBox.style.position = "absolute";
infoBox.style.top = "20px";
infoBox.style.left = "50%";
infoBox.style.transform = "translateX(-50%)";
infoBox.style.background = "rgba(0, 0, 0, 0.75)";
infoBox.style.color = "#fff";
infoBox.style.padding = "10px 15px";
infoBox.style.borderRadius = "8px";
infoBox.style.fontFamily = "Arial, sans-serif";
infoBox.style.fontSize = "16px";
infoBox.style.display = "none";
infoBox.style.zIndex = "10";
document.body.appendChild(infoBox);

// Reset game state to initial values
function resetGame() {
	// reset rocket position and rotation
	try {
		rocket.position.set(0,0,0);
		rocket.rotation.x = Math.PI/2;
		// remove any loaded ship from rocket
		try { disposeCurrent(rocket); } catch(e) {}
		// reset collider to default radius
		try {
			const col = rocket.getObjectByName('playerCollider');
			if (col) {
				col.geometry.dispose();
					col.geometry = new THREE.SphereGeometry(0.6, 12, 12);
					col.position.set(0,0,0);
					// respect the global showPlayerHitbox flag when resetting
					col.visible = !!showPlayerHitbox;
			}
		} catch(e) {}
	} catch (e) {}

	// reset planets
	try {
		for (const p of planets) { resetPlanet(p); if (p.userData) { p.userData.done = false; p.userData.isTarget = false; } }
	} catch (e) {}

	// clear rotating objects
	try { clearRotatingObjects(); } catch(e) {}

	// reset collision and pause flags
	collisionCooldown = false;
	gamePaused = true;
	// cancel any pending collision resume timeout
	try { if (collisionTimeoutId !== null) { clearTimeout(collisionTimeoutId); collisionTimeoutId = null; } } catch(e) {}

	// reset score/targets/lives UI state
	score = 0; lives = 3; currentTargetIndex = findNextTarget(-1); markTarget(currentTargetIndex); try { renderTargetList(); updateHUD(); } catch(e) {}
}

// ====== MOVIMIENTO ======
const keys = {};
const SPEED = 0.12;
let collisionCooldown = false;
let gamePaused = true; // start paused until player begins from the menu
// collision timeout id (so we can cancel it if menu is shown)
let collisionTimeoutId = null;
// Global speed multiplier for the whole game (affects movement, planet speed, rotations)
let globalGameSpeed = 1.0;

window.addEventListener("keydown", (e) => {
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
		e.preventDefault();
	keys[e.code] = true;
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

function updateRocket(dt) {
	if (collisionCooldown || gamePaused) return;
	// keep similar feel to previous per-frame speed by scaling with dt*60
	const moveAmount = SPEED * (globalGameSpeed || 1) * (dt || 0.016) * 60;
	const thrusting = !!keys["ArrowUp"];
	if (keys["ArrowUp"]) rocket.position.y += moveAmount;
	if (keys["ArrowDown"]) rocket.position.y -= moveAmount;
	if (keys["ArrowLeft"]) rocket.position.x -= moveAmount;
	if (keys["ArrowRight"]) rocket.position.x += moveAmount;
	rocket.position.x = THREE.MathUtils.clamp(rocket.position.x, -6, 6);
	rocket.position.y = THREE.MathUtils.clamp(rocket.position.y, -3, 3);

	// banking / roll target based on left/right input
	if (keys["ArrowLeft"]) targetRoll = 0.45;
	else if (keys["ArrowRight"]) targetRoll = -0.45;
	else targetRoll = 0;

	// no particle exhaust: movement-only modifications requested
}

// ====== COLISIONES ======
function checkCollisions() {
	if (collisionCooldown) return;
	// Prefer sphere-based collision between the playerCollider (sphere) and planet spheres.
	// This allows reducing the planet collision radius slightly so visual planets look larger
	// than their collision volume.
	const collider = rocket.getObjectByName('playerCollider');
	if (collider && playerColliderEnabled) {
		// get world position and effective radius of collider
		const cPos = new THREE.Vector3();
		collider.getWorldPosition(cPos);
		let cRadius = 0.5; // fallback
		try {
			const params = collider.geometry.parameters || {};
			const baseR = params.radius || 0.5;
			const s = new THREE.Vector3(); collider.getWorldScale(s);
			const maxS = Math.max(s.x, s.y, s.z, 1);
			cRadius = baseR * maxS;
		} catch (e) {}

		for (const planet of planets) {
			const pPos = new THREE.Vector3();
			planet.getWorldPosition(pPos);
			// planet base radius comes from geometry.parameters.radius (created from planetData.size)
			let pRadius = (planet.geometry && planet.geometry.parameters && planet.geometry.parameters.radius) ? planet.geometry.parameters.radius : (planet.userData && planet.userData.size) || 1.0;
			const ps = new THREE.Vector3(); planet.getWorldScale(ps);
			const pMaxS = Math.max(ps.x, ps.y, ps.z, 1);
			pRadius = pRadius * pMaxS;
			// apply a small shrink so visual planet > collision planet (tunable)
			const planetCollisionScale = (planet.userData && planet.userData.collisionScale) || 0.8; // default 0.8 = 80% of visual radius
			const effectivePRadius = pRadius * planetCollisionScale;
			const dist = cPos.distanceTo(pPos);
			if (dist <= (cRadius + effectivePRadius)) {
				handleCollision(planet);
				break;
			}
		}
	} else {
		// fallback to previous Box3 check if no collider present or collider disabled
		var box = new THREE.Box3().setFromObject(rocket);
		for (const planet of planets) {
			const pBox = new THREE.Box3().setFromObject(planet);
			if (box.intersectsBox(pBox)) {
				handleCollision(planet);
				break;
			}
		}
	}
}

function handleCollision(planet) {
	// basic cooldown to avoid multiple triggers
	collisionCooldown = true;
	// NOTE: Don't reset cooldown here - let it be reset after the pause completes

	// determine index of planet
	const idx = planets.indexOf(planet);
	const isTarget = (idx === currentTargetIndex);

	if (isTarget && !(planet.userData && planet.userData.done)) {
		// correct collision: mark done, pause game, show info overlay for 3 seconds
		if (planet.userData) planet.userData.done = true;
		score += 1;
		// clear any target flag for this planet
		if (planet.material && planet.material.emissive) planet.material.emissiveIntensity = 0.0;
		
		// PAUSE GAME and show centered info overlay
		gamePaused = true;
		try {
			const overlay = document.getElementById('collisionInfoOverlay');
			const nameEl = document.getElementById('collisionPlanetName');
			const infoEl = document.getElementById('collisionPlanetInfo');
			if (nameEl) nameEl.textContent = planet.userData.name || 'Planeta';
			if (infoEl) infoEl.textContent = planet.userData.info || 'Sin información disponible.';
			if (overlay) overlay.style.display = 'flex';
		} catch(e) { console.warn('Failed to show collision info overlay', e); }

		// Reset visible planets (those with z > -20) to avoid accidental re-collisions
		try {
			for (const p of planets) {
				if (p.position.z > -20) resetPlanet(p);
			}
		} catch(e) { console.warn('resetPlanet failed', e); }

		// After 3 seconds: hide overlay, select next target, update UI, resume game
		setTimeout(() => {
			try {
				const overlay = document.getElementById('collisionInfoOverlay');
				if (overlay) overlay.style.display = 'none';
			} catch(e) {}
			// select next target
			currentTargetIndex = findNextTarget(currentTargetIndex);
			markTarget(currentTargetIndex);
			try { renderTargetList(); } catch(e) {}
			try { updateHUD(); } catch(e) {}
			// check victory
			if (score >= TOTAL_TARGETS) {
				showEndMessage('¡VICTORY! Completaste los 8 planetas.');
			} else {
				gamePaused = false; // resume
			}
			// Reset cooldown AFTER the pause completes
			collisionCooldown = false;
		}, 3000);

	} else {
		// incorrect collision: lose a life, explode planet, pause 1 second
		lives -= 1;
		try { updateHUD(); } catch(e) {}
		
		// EXPLODE the planet
		try { explodePlanet(planet); } catch(e) { console.warn('explodePlanet failed', e); }
		
		// PAUSE GAME for 1 second
		gamePaused = true;
		
		// small bounce-back
		try {
			const v = new THREE.Vector3(); planet.getWorldPosition(v);
			rocket.position.x += (rocket.position.x - v.x) * 0.2;
			rocket.position.y += (rocket.position.y - v.y) * 0.2;
		} catch(e) {}
		
		// show life lost message briefly
		try {
			infoBox.innerHTML = `<strong>¡Perdiste una vida!</strong> Planeta incorrecto.`;
			infoBox.style.display = 'block';
		} catch(e) {}
		
		// After 1 second: hide message, respawn planet, resume or game over
		setTimeout(() => {
			try { infoBox.style.display = 'none'; } catch(e) {}
			// respawn the exploded planet
			try { 
				planet.visible = true;
				resetPlanet(planet); 
			} catch(e) {}
			// check defeat
			if (lives <= 0) {
				showEndMessage('GAME OVER – Recargá la página para volver a intentar');
			} else {
				gamePaused = false; // resume
			}
			// Reset cooldown AFTER the pause completes
			collisionCooldown = false;
		}, 1000); // 1 second pause
	}
}

// ====== LOOP ======
function animate(time) {
	requestAnimationFrame(animate);
	if (!time) time = performance && performance.now ? performance.now() : Date.now();
	const dt = Math.min(0.05, (time - lastTime) / 1000);
	lastTime = time;

	if (!gamePaused) {
		updateRocket(dt);
		planets.forEach((p) => {
			p.position.z += 0.5 * (globalGameSpeed || 1) * dt * 60;
			if (p.position.z > 5) resetPlanet(p);
				// use per-planet rotation speed when available
				const speed = (p.userData && p.userData.rotationSpeed) ? p.userData.rotationSpeed : 0.01;
				p.rotation.y += speed * (globalGameSpeed || 1) * dt * 60;
		});
		// no flame/tipLight - the loaded ship model will show its own effects if any
	}

	// visual pulse for the current target planet (emissive flicker)
	const tNow = performance && performance.now ? performance.now() : Date.now();
	for (let i=0;i<planets.length;i++){
		const p = planets[i];
		if (p && p.material && p.userData && p.userData.isTarget && !p.userData.done) {
			try {
				if (!p.material.emissive) p.material.emissive = new THREE.Color(0xffffcc);
				p.material.emissiveIntensity = 0.25 + 0.3 * Math.sin(tNow/220 + i);
			} catch(e) {}
			// ensure particle emitter exists and is visible
			try { ensureParticleEmitter(p); if (p.userData && p.userData.particleSystem) p.userData.particleSystem.visible = true; } catch(e) {}
		} else {
			try { if (p && p.material && p.material.emissive) p.material.emissiveIntensity = 0; } catch(e) {}
			try { if (p && p.userData && p.userData.particleSystem) p.userData.particleSystem.visible = false; } catch(e) {}
		}
	}

	// rotate any visible particle systems for a subtle motion
	for (let i=0;i<planets.length;i++){
		const p = planets[i];
		if (p && p.userData && p.userData.particleSystem && p.userData.particleSystem.visible) {
			try { p.userData.particleSystem.rotation.y += 0.02 * (globalGameSpeed || 1) * dt * 60; } catch(e) {}
		}
	}

	// rotate any objects flagged for auto-rotate
	if (rotatingObjects.length) {
		for (const obj of rotatingObjects) {
			if (obj && obj.rotation) obj.rotation.y += 0.01 * (globalGameSpeed || 1) * dt * 60;
		}
	}

	// update banking/roll interpolation
	currentRoll += (targetRoll - currentRoll) * ROLL_LERP;
	rocket.rotation.z = currentRoll;

	// no particle updates (particles were removed)

	checkCollisions();
	renderer.render(scene, camera);
}
animate();

// ====== RESIZE ======
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
