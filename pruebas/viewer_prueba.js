import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { loadInto, setScaleOnParent, setPositionOnParent, setRotationOnParent, disposeCurrent } from '../src/ship/shipManager.js';
import { getPresetForUrl } from '../src/ship/shipConfig.js';

const container = document.getElementById('canvasContainer');
const infoEl = document.getElementById('info');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050516);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xddeeff, 0x202033, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 7.5);
scene.add(dir);

// Simple "planet" object to show other game objects
const planetGeo = new THREE.SphereGeometry(0.6, 32, 32);
const planetMat = new THREE.MeshStandardMaterial({ color: 0x4477ff, roughness: 0.7, metalness: 0.1 });
const planet = new THREE.Mesh(planetGeo, planetMat);
planet.position.set(-2.0, 0.7, -1.8);
scene.add(planet);

// subtle stars background
const starsGeo = new THREE.SphereGeometry(80, 32, 32);
const starsMat = new THREE.MeshBasicMaterial({ color: 0x001122, side: THREE.BackSide });
const stars = new THREE.Mesh(starsGeo, starsMat);
scene.add(stars);

// Axes helper sincronizado: se recreará después de rotar el grupo para coincidir visualmente
let axes = new THREE.AxesHelper(1.5);
axes.name = 'modelAxes';

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.update();

// === Configuración editable de ejes (solo VISOR DE PRUEBAS) ===
// Ajusta estos ángulos (en radianes) para cambiar la orientación de los ejes.
// La nave girará junto con los ejes porque rotamos el grupo contenedor (modelGroup).
// Ejemplos útiles:
//  - { x: 0, y: 0, z: Math.PI/2 }   -> "acostada" 90° en Z
//  - { x: 0, y: 0, z: 0 }           -> sin rotación extra
//  - { x: -Math.PI/2, y: 0, z: 0 }  -> Z del modelo apuntando hacia abajo
const VIEWER_AXES_ROT = { x: -Math.PI/2, y: 0, z: Math.PI/2 };
// Ignorar preset.position en el VISOR para mantener la nave centrada
const VIEWER_IGNORE_PRESET_POSITION = true;

// Rotaciones específicas por nave (EDITA AQUÍ)
// Clave: nombre del archivo .glb
// Valores: ángulos en radianes a sumar a esa nave después de cargarla
// Ejemplo: para dar vuelta la nave 2 sobre Z (180°): z: Math.PI
const PER_SHIP_ROT = {
  // Nave 1: mantener "dar vuelta" (roll Z=180°) y mirar en dirección contraria (Y=180°)
  // Si solo quieres invertir la dirección, cambia y: Math.PI y deja z: 0
  // Si solo quieres "dar vuelta" sin cambiar dirección, deja y: 0 y z: Math.PI
  'ship1.glb': { x: 0, y: Math.PI, z: Math.PI },
  // Nave 2: "dar vuelta" por roll Z (puedes añadir y: Math.PI si también quieres invertir su dirección)
  'ship2.glb': { x: 0, y: 0, z: Math.PI }
};

// === HITBOX/COLLIDER (EDITA AQUÍ) ===
// Usa el mismo radio de hitbox para TODAS las naves en el VISOR.
// Cambia VIEWER_HITBOX_RADIUS para ajustar el tamaño manualmente.
// Si prefieres usar el radio definido por cada preset, pon VIEWER_HITBOX_FROM_PRESET = true.
const VIEWER_HITBOX_FROM_PRESET = false;  // false = usar el valor manual de abajo
const VIEWER_HITBOX_RADIUS = 0.45;        // radio manual (mismo para todas las naves)
const VIEWER_HITBOX_SEGMENTS = 12;        // detalle del wireframe (puedes subirlo si lo quieres más suave)

// Posiciones específicas por nave (EDITA AQUÍ)
// Se aplican después de cualquier centrado/rotación. Útil para corregir ligeros desvíos.
// x: izquierda(-)/derecha(+), y: abajo(-)/arriba(+), z: atrás(-)/adelante(+)
// Ejemplo: ship3 corrida a la derecha -> { x: -0.15, y: 0, z: 0 }
const PER_SHIP_OFFSET = {
  'ship1.glb': { x: 0, y: 0, z: 0 },
  'ship2.glb': { x: 0, y: 0, z: -1.5 },
  'ship3.glb': { x: 0, y: 0.50, z: 0 }
};

let currentModel = null;
let currentAutoRotate = false;
// wrap models in a group so we can position the container (keeps alignment with any collider)
const modelGroup = new THREE.Group();
scene.add(modelGroup);
// attach the axes and a red collider-sphere to the modelGroup so their center equals the collision point
modelGroup.add(axes);
const viewerCollider = new THREE.Mesh(
  new THREE.SphereGeometry(0.45, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
);
viewerCollider.name = 'viewerCollider';
modelGroup.add(viewerCollider);

function disposeModel(obj) {
  if (!obj) return;
  try {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose?.();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose();
        }
      }
    });
  } catch (e) {
    console.warn('Error disposing model', e);
  }
}

function fitModelToView(object, scaleFactor = 1.0) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = (1.4 / maxDim) * scaleFactor;
    object.scale.setScalar(scale);
  }
  // center
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.sub(center);
}

async function loadModel(url) {
  infoEl.textContent = 'Cargando...';
  // dispose previous
  try {
    disposeCurrent(modelGroup);
  } catch (e) {}
  // ensure the scene-level planet is visible when loading a ship
  try { planet.visible = true; } catch (e) {}
  // load via shipManager so centering/material tweaks match the game
  try {
    await loadInto(modelGroup, url);
    const preset = getPresetForUrl(url);
    // apply scale/position/rotation using helpers so behaviour matches main_juego
    if (preset && preset.scale) setScaleOnParent(modelGroup, preset.scale);
    // En el visor, podemos ignorar el offset de posición del preset para que siempre
    // quede centrada y visible. Cambia VIEWER_IGNORE_PRESET_POSITION para alternar.
    if (!VIEWER_IGNORE_PRESET_POSITION) {
      try { setPositionOnParent(modelGroup, ...(preset.position || [0, 0.2, 0])); } catch(e) {}
    }
    try { setRotationOnParent(modelGroup, ...(preset.rotation || [0,0,0])); } catch(e) {}
    // Rotar el grupo contenedor para que los ejes y la nave coincidan con tu configuración
    try { modelGroup.rotation.set(VIEWER_AXES_ROT.x, VIEWER_AXES_ROT.y, VIEWER_AXES_ROT.z); } catch (e) {}
    // Re-crear ejes para que no queden con orientación antigua (opcional; puedes eliminar si no lo necesitas)
    try {
      const oldAxes = modelGroup.getObjectByName('modelAxes');
      if (oldAxes) modelGroup.remove(oldAxes);
      axes = new THREE.AxesHelper(1.5);
      axes.name = 'modelAxes';
      modelGroup.add(axes);
    } catch (e) {}
  currentAutoRotate = !!preset.autoRotate;
  // Nota: no sobreescribimos más la rotación; usa VIEWER_AXES_ROT arriba para cambiar orientación
  // expose reference to loaded model for auto-rotate handling
  currentModel = modelGroup.getObjectByName('loadedShip');
    // Si se ignora la posición del preset, centrar explícitamente el modelo
    try {
      if (VIEWER_IGNORE_PRESET_POSITION && currentModel) {
        currentModel.position.set(0, 0, 0);
      }
    } catch (e) {}
    // Aplicar rotación específica por nave definida en PER_SHIP_ROT
    try {
      const file = (url.split('/').pop() || '').toLowerCase();
      const off = PER_SHIP_ROT[file];
      if (currentModel && off) {
        currentModel.rotation.x += off.x || 0;
        currentModel.rotation.y += off.y || 0;
        currentModel.rotation.z += off.z || 0;
      }
    } catch (e) {}
    // Aplicar offset por nave
    try {
      const file2 = (url.split('/').pop() || '').toLowerCase();
      const ofs = PER_SHIP_OFFSET[file2];
      if (currentModel && ofs) {
        currentModel.position.x += ofs.x || 0;
        currentModel.position.y += ofs.y || 0;
        currentModel.position.z += ofs.z || 0;
      }
    } catch (e) {}
    // Actualizar el hitbox con un radio unificado o el del preset, según configuración
    try {
      const r = VIEWER_HITBOX_FROM_PRESET ? (preset.colliderRadius || VIEWER_HITBOX_RADIUS) : VIEWER_HITBOX_RADIUS;
      viewerCollider.geometry.dispose();
      viewerCollider.geometry = new THREE.SphereGeometry(r, VIEWER_HITBOX_SEGMENTS, VIEWER_HITBOX_SEGMENTS);
    } catch (e) {}
    // Keep the viewer's original behaviour: fixed initial camera and visible axes/collider.
    // The menu preview (main_juego) is the one that was adjusted to ensure the ship is visible there.
    infoEl.textContent = `Modelo: ${url.split('/').pop()}`;
  } catch (err) {
    console.error('Error cargando modelo (viewer):', err);
    infoEl.textContent = 'Error cargando modelo (ver consola)';
  }
}

// initial model
const select = document.getElementById('modelSelect');
select.addEventListener('change', (e) => {
  loadModel(e.target.value);
});
loadModel(select.value);

// toggle axes visibility from UI
const axesToggle = document.getElementById('axesToggle');
if (axesToggle) {
  axesToggle.addEventListener('change', (e) => {
    axes.visible = e.target.checked;
  });
  // ensure initial state matches checkbox
  axes.visible = axesToggle.checked;
}

// collider visibility toggle
const colliderToggle = document.getElementById('colliderToggle');
if (colliderToggle) {
  colliderToggle.addEventListener('change', (e) => {
    try { viewerCollider.visible = e.target.checked; } catch (err) { /* viewerCollider may not exist yet */ }
  });
  // set initial state (if viewerCollider exists)
  try { viewerCollider.visible = colliderToggle.checked; } catch (err) {}
}

// Planet preview selector
const planetSelect = document.getElementById('planetSelect');
const planetSizes = {
  mercury: 0.5,
  venus: 0.8,
  earth: 0.9,
  mars: 0.7,
  jupiter: 1.2,
  saturn: 1.0,
  uranus: 0.8,
  neptune: 0.7
};

function showPlanetPreview(key) {
  try { disposeCurrent(modelGroup); } catch (e) {}
  if (!key || key === 'none') {
    try { planet.visible = true; } catch (e) {}
    return;
  }
  const texPath = `../textures/${key}.jpg`;
  const loader = new THREE.TextureLoader();
  const mat = new THREE.MeshStandardMaterial({ map: loader.load(texPath), roughness: 0.7, metalness: 0.05 });
  const size = planetSizes[key] || 0.8;
  const geo = new THREE.SphereGeometry(size, 48, 48);
  const mesh = new THREE.Mesh(geo, mat);
  // name as 'loadedShip' so disposeCurrent(parent) will remove it consistently
  mesh.name = 'loadedShip';
  // place at origin so modelGroup axes/collider are meaningful
  mesh.position.set(0, 0, 0);
  modelGroup.add(mesh);
  // hide the small scene-planet (if present) to avoid confusion
  try { planet.visible = false; } catch (e) {}
}

if (planetSelect) {
  planetSelect.addEventListener('change', (e) => {
    const v = e.target.value;
    // when selecting a planet, clear the ship select
    try { select.value = select.value; } catch (e) {}
    showPlanetPreview(v);
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (currentModel && currentAutoRotate) currentModel.rotation.y += 0.007;
  planet.rotation.y += 0.0015;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
