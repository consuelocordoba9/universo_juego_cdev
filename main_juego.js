import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/shaders/FXAAShader.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/environments/RoomEnvironment.js";
import { Lensflare, LensflareElement } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/objects/Lensflare.js";
import { loadInto, setScaleOnParent, setPositionOnParent, disposeCurrent, setRotationOnParent } from './src/ship/shipManager.js';
import { getPresetForUrl } from './src/ship/shipConfig.js';
// ====== ESCENA, CÁMARA Y RENDER ======
const scene = new THREE.Scene();
const spaceTexture = new THREE.TextureLoader().load("./textures/space_bg.jpg");
// Niebla exponencial suave para dar profundidad visual (no afecta HUD)
scene.fog = new THREE.FogExp2(0x02060f, 0.0025);
// Aplicar gestión de color correcta a la textura de fondo
spaceTexture.encoding = THREE.sRGBEncoding;
scene.background = spaceTexture;

const camera = new THREE.PerspectiveCamera(
	60,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.set(0, 1, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Mejora de calidad de imagen y luces físicas
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

// PMREM + entorno para mejorar materiales estándar/physically
try {
	const pmrem = new THREE.PMREMGenerator(renderer);
	const envTex = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
	scene.environment = envTex;
} catch (e) {
	console.warn('No se pudo inicializar el entorno PBR:', e);
}

// Valor de anisotropía máximo disponible
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;

// ====== LUCES ======
const ambient = new THREE.AmbientLight(0x404040, 0.8);
const point = new THREE.PointLight(0xffffff, 10, 0, 2);
point.position.set(0, 10, 10);
// Luz direccional tipo "Sol" desde el fondo
const sunLightDir = new THREE.DirectionalLight(0xfff0c4, 1.4);
sunLightDir.position.set(40, 20, -120);
scene.add(ambient, point, sunLightDir);

// Sprite/flare para el sol lejano (visual)
try {
	const textureLoader = new THREE.TextureLoader();
	const flare0 = textureLoader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/lensflare/lensflare0.png');
	const flare3 = textureLoader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/lensflare/lensflare3.png');
	const lensflare = new Lensflare();
	lensflare.addElement(new LensflareElement(flare0, 210, 0.0, new THREE.Color(0xfff3c6)));
	lensflare.addElement(new LensflareElement(flare3, 120, 0.3));
	lensflare.addElement(new LensflareElement(flare3, 70, 0.6));
	lensflare.position.copy(sunLightDir.position);
	scene.add(lensflare);
} catch (e) {
	console.warn('Lensflare no disponible:', e);
}

// ====== FONDO DE ESTRELLAS ======
let starField = null;
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
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	starField = new THREE.Points(geo, mat);
	starField.frustumCulled = false;
	scene.add(starField);
}
createStars();

// ====== POSTPROCESADO (Bloom + FXAA) ======
let composer = null;
let bloomPass = null;
let fxaaPass = null;
let bloomEnabled = true;
function setupPostprocessing() {
    try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.6, 0.85);
        bloomPass.enabled = bloomEnabled;
        composer.addPass(bloomPass);
        // FXAA opcional para suavizar bordes
        fxaaPass = new ShaderPass(FXAAShader);
        fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        composer.addPass(fxaaPass);
    } catch (e) {
        console.warn('Postprocesado no disponible:', e);
        composer = null;
    }
}
setupPostprocessing();

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

// Función para alternar visibilidad del collider (expuesta globalmente)
function setPlayerColliderVisible(visible) {
	playerCollider.visible = !!visible;
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
	const startInfo = document.getElementById('startInfo');

	if (!menu || !select) return;

		// --- Preview image (static) ---
		const previewImage = document.getElementById('previewImage');
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

		// Preview when selection changes
		select.addEventListener('change', (e) => preview(e.target.value));

		// initial preview for selected ship (apply preset)
		preview(select.value);

	startBtn.addEventListener('click', async () => {
		// when starting, load the selected ship into the main rocket with preset
		const url = select.value;
		const preset = getPresetForUrl(url);
		try {
			await loadInto(rocket, url);
						// apply preset to main rocket
						setScaleOnParent(rocket, preset.scale);
						// position the loaded ship (child) relative to the rocket parent so the collider stays at origin
						try { setPositionOnParent(rocket, ...(preset.position || [0,0,0])); } catch(e) {}
						try { setRotationOnParent(rocket, ...(preset.rotation || [0,0,0])); } catch(e) {}
						// set collider radius for this ship
						try {
							const radius = preset.colliderRadius || 0.45;
							rocket.getObjectByName('playerCollider').geometry.dispose();
							rocket.getObjectByName('playerCollider').geometry = new THREE.SphereGeometry(radius, 12, 12);
						} catch (e) {
							// ignore if collider not found
						}
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
	});

	// (Botón Cerrar eliminado)
}

// initialize menu when DOM ready
window.addEventListener('DOMContentLoaded', setupStartMenu);

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
		info: "El más cercano al Sol.",
	},
	{
		name: "Venus",
		size: 0.8,
		texture: "./textures/venus.jpg",
		info: "El planeta más caliente.",
	},
	{
		name: "Tierra",
		size: 0.9,
		texture: "./textures/earth.jpg",
		info: "Nuestro hogar azul.",
	},
	{
		name: "Marte",
		size: 0.7,
		texture: "./textures/mars.jpg",
		info: "El planeta rojo.",
	},
	{
		name: "Júpiter",
		size: 1.2,
		texture: "./textures/jupiter.jpg",
		info: "El más grande del sistema solar.",
	},
	{
		name: "Saturno",
		size: 1.0,
		texture: "./textures/saturn.jpg",
		info: "Con impresionantes anillos.",
	},
	{
		name: "Urano",
		size: 0.8,
		texture: "./textures/uranus.jpg",
		info: "Gira de lado.",
	},
	{
		name: "Neptuno",
		size: 0.7,
		texture: "./textures/neptune.jpg",
		info: "El más lejano y ventoso.",
	},
];

const planets = [];
planetData.forEach((d) => {
	const tex = new THREE.TextureLoader().load(d.texture);
	tex.encoding = THREE.SRGBEncoding;
	tex.anisotropy = MAX_ANISO;
	const p = new THREE.Mesh(
		new THREE.SphereGeometry(d.size, 32, 32),
		new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.0 })
	);
	resetPlanet(p);
	p.userData = d;
	// Halo atmosférico sutil (visual)
	try {
		const halo = new THREE.Mesh(
			new THREE.SphereGeometry(d.size * 1.06, 32, 32),
			new THREE.MeshBasicMaterial({
				color: new THREE.Color(d.name === 'Tierra' ? 0x66aaff : 0xffeecc),
				transparent: true,
				opacity: 0.08,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.BackSide
			})
		);
		p.add(halo);
	} catch (e) {}
	// Velocidad de rotación proporcional al tamaño (grandes rotan más lento)
	p.userData.rotSpeed = Math.max(0.004, 0.014 - d.size * 0.004);
	scene.add(p);
	planets.push(p);
});

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

// ====== HUD y UI ======
const hud = {
	scoreEl: document.getElementById('score'),
	livesEl: document.getElementById('lives'),
	speedEl: document.getElementById('speed'),
	bestScoreEl: document.getElementById('bestScore'),
	pauseBtn: document.getElementById('pauseBtn'),
	muteBtn: document.getElementById('muteBtn'),
	encyBtn: document.getElementById('encyBtn')
};
const overUI = {
	panel: document.getElementById('gameOver'),
	score: document.getElementById('finalScore'),
	best: document.getElementById('finalBest'),
	restart: document.getElementById('restartBtn'),
	menu: document.getElementById('goMenuBtn')
};
const encyUI = {
	panel: document.getElementById('encyclopedia'),
	list: document.getElementById('encyList'),
	close: document.getElementById('encyClose')
};

// ====== Estado del juego ======
let score = 0;
let lives = 3;
let bestScore = 0;
try { bestScore = parseInt(localStorage.getItem('bestScore') || '0', 10) || 0; } catch(e) {}
let speedMultiplier = 1; // aumenta con el puntaje
let muted = false;

function updateHUD() {
	if (hud.scoreEl) hud.scoreEl.textContent = Math.floor(score).toString();
	if (hud.livesEl) hud.livesEl.textContent = lives.toString();
	if (hud.speedEl) hud.speedEl.textContent = `${speedMultiplier.toFixed(2)}x`;
	if (hud.bestScoreEl) hud.bestScoreEl.textContent = bestScore.toString();
}
updateHUD();

// ====== Sonidos simples (Web Audio) ======
let audioCtx = null;
function ensureAudio() {
	if (!audioCtx) {
		try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
	}
}
function beep(type = 'ok') {
	if (muted) return;
	ensureAudio();
	if (!audioCtx) return;
	const o = audioCtx.createOscillator();
	const g = audioCtx.createGain();
	o.connect(g); g.connect(audioCtx.destination);
	const now = audioCtx.currentTime;
	let freq = 440;
	if (type === 'ok') freq = 660; else if (type === 'bad') freq = 220; else if (type === 'tick') freq = 520;
	o.frequency.setValueAtTime(freq, now);
	g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
	o.start(now); o.stop(now + 0.2);
}

// ====== MOVIMIENTO ======
const keys = {};
const SPEED = 0.12;
let collisionCooldown = false;
let gamePaused = true; // start paused until player begins from the menu
let inModal = false; // bloquea controles cuando hay modal

window.addEventListener("keydown", (e) => {
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
		e.preventDefault();
	keys[e.code] = true;
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

function updateRocket() {
	if (collisionCooldown || gamePaused || inModal) return;
	if (keys["ArrowUp"]) rocket.position.y += SPEED;
	if (keys["ArrowDown"]) rocket.position.y -= SPEED;
	if (keys["ArrowLeft"]) rocket.position.x -= SPEED;
	if (keys["ArrowRight"]) rocket.position.x += SPEED;
	rocket.position.x = THREE.MathUtils.clamp(rocket.position.x, -6, 6);
	rocket.position.y = THREE.MathUtils.clamp(rocket.position.y, -3, 3);
}

// ====== COLISIONES ======
function checkCollisions() {
	if (collisionCooldown) return;
	// Usamos el collider (si existe) para las colisiones; si no, caemos al grupo completo
	const collider = rocket.getObjectByName('playerCollider');
	if (collider) {
		if (!playerColliderEnabled) return; // collider deshabilitado
		var box = new THREE.Box3().setFromObject(collider);
	} else {
		var box = new THREE.Box3().setFromObject(rocket);
	}
	for (const planet of planets) {
		const pBox = new THREE.Box3().setFromObject(planet);
		if (box.intersectsBox(pBox)) {
			handleCollision(planet);
			break;
		}
	}
}

function handleCollision(planet) {
	collisionCooldown = true;
	gamePaused = true; // 🔹 pausa global
	lives = Math.max(0, lives - 1);
	updateHUD();
	beep('bad');
	infoBox.innerHTML = `<strong>${planet.userData.name}</strong> — ${planet.userData.info}`;
	infoBox.style.display = "block";

	setTimeout(() => {
		infoBox.style.display = "none";
		resetPlanet(planet);
		collisionCooldown = false;
		if (lives <= 0) {
			endGame();
		} else {
			gamePaused = false; // 🔹 reanuda todo
		}
	}, 1600);
}

function endGame() {
	gamePaused = true;
	inModal = true;
	try {
		if (score > bestScore) { bestScore = Math.floor(score); localStorage.setItem('bestScore', bestScore.toString()); }
	} catch(e) {}
	updateHUD();
	if (overUI.score) overUI.score.textContent = Math.floor(score).toString();
	if (overUI.best) overUI.best.textContent = bestScore.toString();
	if (overUI.panel) overUI.panel.style.display = 'flex';
}

function restartGame(toMenu=false) {
	// reset state
	score = 0; lives = 3; speedMultiplier = 1; updateHUD();
	// reset positions of planets
	planets.forEach(p => resetPlanet(p));
	// (sin tokens/trivias)
	if (overUI.panel) overUI.panel.style.display = 'none';
	inModal = false;
	if (toMenu) {
		// show start menu again
		const menu = document.getElementById('startMenu');
		if (menu) menu.style.display = 'flex';
		gamePaused = true;
	} else {
		gamePaused = false;
	}
}

// ====== LOOP ======
function animate() {
	requestAnimationFrame(animate);

	if (!gamePaused && !inModal) {
		updateRocket();
		planets.forEach((p) => {
			p.position.z += 0.5 * speedMultiplier;
			if (p.position.z > 5) resetPlanet(p);
			p.rotation.y += (p.userData.rotSpeed || 0.01);
		});
		// puntuación por tiempo (en tiempo real)
		score += 0.05 * speedMultiplier;
		updateHUD();
		// ajustar velocidad según puntaje: cada 50 puntos, +0.15x
		const targetSpeed = 1 + Math.floor(score / 50) * 0.15;
		if (targetSpeed !== speedMultiplier) { speedMultiplier = targetSpeed; beep('tick'); updateHUD(); }
		// no flame/tipLight - the loaded ship model will show its own effects if any
	}

	// rotate any objects flagged for auto-rotate
	if (rotatingObjects.length) {
		for (const obj of rotatingObjects) {
			if (obj && obj.rotation) obj.rotation.y += 0.01;
		}
	}

	// sutil movimiento del campo estelar para dar vida
	if (starField) {
		starField.rotation.z += 0.0005;
	}

	checkCollisions();
	if (composer) {
		composer.render();
	} else {
		renderer.render(scene, camera);
	}
}
animate();

// ====== RESIZE ======
window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	if (composer) composer.setSize(window.innerWidth, window.innerHeight);
	if (fxaaPass) fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
});

// (Se eliminaron tokens y trivias)

// ====== Botones HUD ======
if (hud.pauseBtn) hud.pauseBtn.addEventListener('click', () => {
	gamePaused = !gamePaused;
	hud.pauseBtn.textContent = gamePaused ? 'Reanudar' : 'Pausa';
});
if (hud.muteBtn) hud.muteBtn.addEventListener('click', () => {
	muted = !muted;
	hud.muteBtn.textContent = muted ? 'Activar Sonido' : 'Silencio';
	if (!muted) beep('tick');
});
// Toggle de Bloom con tecla B y pista en instrucciones
window.addEventListener('keydown', (e) => {
	if (e.code === 'KeyB') {
		bloomEnabled = !bloomEnabled;
		if (bloomPass) bloomPass.enabled = bloomEnabled;
		beep('tick');
	}
});
try {
	const instr = document.getElementById('instructions');
	if (instr) instr.innerHTML += '<br>• Tecla B: activar/desactivar brillo (bloom)';
} catch (e) {}
if (overUI.restart) overUI.restart.addEventListener('click', () => restartGame(false));
if (overUI.menu) overUI.menu.addEventListener('click', () => restartGame(true));

// ====== Enciclopedia ======
function buildEncyclopedia() {
	if (!encyUI.list) return;
	encyUI.list.innerHTML = '';
	for (const d of planetData) {
		const card = document.createElement('div'); card.className = 'encyCard';
		const img = document.createElement('img'); img.src = d.texture; img.alt = d.name; img.style.maxWidth = '100%'; img.style.borderRadius = '6px'; img.style.display = 'block'; img.style.marginBottom = '6px';
		const h = document.createElement('h4'); h.textContent = d.name;
		const p = document.createElement('div'); p.textContent = d.info;
		card.appendChild(img); card.appendChild(h); card.appendChild(p);
		encyUI.list.appendChild(card);
	}
}
if (hud.encyBtn) hud.encyBtn.addEventListener('click', () => { buildEncyclopedia(); encyUI.panel.style.display = 'flex'; inModal = true; gamePaused = true; });
if (encyUI.close) encyUI.close.addEventListener('click', () => { encyUI.panel.style.display = 'none'; inModal = false; gamePaused = false; });
