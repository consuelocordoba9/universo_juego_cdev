import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
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
const rocket = new THREE.Group();

// cuerpo
const body = new THREE.Mesh(
	new THREE.CylinderGeometry(0.3, 0.4, 2, 32),
	new THREE.MeshStandardMaterial({
		color: 0xd32f2f,
		metalness: 0.8,
		roughness: 0.3,
	})
);
rocket.add(body);

// punta
const nose = new THREE.Mesh(
	new THREE.ConeGeometry(0.3, 0.7, 32),
	new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6 })
);
nose.position.y = 1.3;
rocket.add(nose);

// fuego
const flame = new THREE.Mesh(
	new THREE.ConeGeometry(0.25, 0.8, 16),
	new THREE.MeshStandardMaterial({
		color: 0xff6600,
		emissive: 0xff2200,
		emissiveIntensity: 2,
	})
);
flame.position.y = -1.4;
flame.rotation.x = Math.PI;
rocket.add(flame);

// luz roja parpadeante
const tipLight = new THREE.PointLight(0xff0000, 2, 10);
tipLight.position.set(0, 1.5, 0);
rocket.add(tipLight);

scene.add(rocket);
rocket.rotation.x = Math.PI / 2;
rocket.position.set(0, 0, 0);

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
let gamePaused = false; // 🔹 para frenar todo

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
	const box = new THREE.Box3().setFromObject(rocket);
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

	const originalColor = body.material.color.getHex();
	body.material.color.set(0xffff00);
	infoBox.innerHTML = `<strong>${planet.userData.name}</strong> — ${planet.userData.info}`;
	infoBox.style.display = "block";

	setTimeout(() => {
		infoBox.style.display = "none";
		body.material.color.set(originalColor);
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
		flame.scale.y = 1 + Math.sin(Date.now() * 0.05) * 0.3;
		tipLight.intensity = 1 + Math.sin(Date.now() * 0.02) * 0.5;
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
