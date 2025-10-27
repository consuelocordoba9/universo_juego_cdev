import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
import { loadInto, setScaleOnParent, setPositionOnParent, disposeCurrent, setRotationOnParent } from './src/ship/shipManager.js';
import { getPresetForUrl } from './src/ship/shipConfig.js';
// ====== ESCENA, CÁMARA Y RENDER ======
const scene = new THREE.Scene();
const spaceTexture = new THREE.TextureLoader().load("./textures/space_bg.jpg");
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
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
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
createStars();

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
	const cancelBtn = document.getElementById('cancelStartBtn');
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

	cancelBtn.addEventListener('click', () => {
		menu.style.display = 'none';
		gamePaused = false; // start game loop without changes
	});
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
	const p = new THREE.Mesh(
		new THREE.SphereGeometry(d.size, 32, 32),
		new THREE.MeshStandardMaterial({ map: tex })
	);
	resetPlanet(p);
	p.userData = d;
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

// ====== MOVIMIENTO ======
const keys = {};
const SPEED = 0.12;
let collisionCooldown = false;
let gamePaused = true; // start paused until player begins from the menu

window.addEventListener("keydown", (e) => {
	if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
		e.preventDefault();
	keys[e.code] = true;
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));

function updateRocket() {
	if (collisionCooldown || gamePaused) return;
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
	infoBox.innerHTML = `<strong>${planet.userData.name}</strong> — ${planet.userData.info}`;
	infoBox.style.display = "block";

	setTimeout(() => {
		infoBox.style.display = "none";
		resetPlanet(planet);
		collisionCooldown = false;
		gamePaused = false; // 🔹 reanuda todo
	}, 2000); // pausa global de 2 segundos
}

// ====== LOOP ======
function animate() {
	requestAnimationFrame(animate);

	if (!gamePaused) {
		updateRocket();
		planets.forEach((p) => {
			p.position.z += 0.5;
			if (p.position.z > 5) resetPlanet(p);
			p.rotation.y += 0.01;
		});
		// no flame/tipLight - the loaded ship model will show its own effects if any
	}

	// rotate any objects flagged for auto-rotate
	if (rotatingObjects.length) {
		for (const obj of rotatingObjects) {
			if (obj && obj.rotation) obj.rotation.y += 0.01;
		}
	}

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
