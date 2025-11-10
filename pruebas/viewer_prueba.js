import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/PointerLockControls.js';
import { loadInto, setScaleOnParent, setPositionOnParent, setRotationOnParent, disposeCurrent } from '../src/ship/shipManager.js';
import { getPresetForUrl } from '../src/ship/shipConfig.js';

const container = document.getElementById('canvasContainer');
const infoEl = document.getElementById('info');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050516);

// Ajustes iniciales de cámara (EDITA AQUÍ)
const VIEWER_CAMERA_POS = { x: 0, y: 1.5, z: 4 };     // altura más baja (y)
const VIEWER_CAMERA_TARGET = { x: 0, y: -0, z: 0 };  // apunta un poco más abajo

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(VIEWER_CAMERA_POS.x, VIEWER_CAMERA_POS.y, VIEWER_CAMERA_POS.z);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Reloj para delta en animación (necesario para cámara libre)
const clock = new THREE.Clock();

const hemi = new THREE.HemisphereLight(0xddeeff, 0x202033, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 7.5);
scene.add(dir);

// Planeta de fondo (inicialmente oculto hasta seleccionar uno en el combo)
let planet = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x4477ff, roughness: 0.7, metalness: 0.1 })
);
// Posición por defecto del planeta como fondo (no centrado)
const BACKGROUND_PLANET_POS = new THREE.Vector3(-2.0, 0.7, -1.8);
planet.position.copy(BACKGROUND_PLANET_POS);
planet.visible = false; // No mostrar nada mientras selección = ninguno
scene.add(planet);
// Guardamos la última selección de planeta del combo para reutilizarla al cambiar de nave
let lastPlanetKey = null; // 'none' | null | nombre del planeta

// subtle stars background
const starsGeo = new THREE.SphereGeometry(80, 32, 32);
const starsMat = new THREE.MeshBasicMaterial({ color: 0x001122, side: THREE.BackSide });
const stars = new THREE.Mesh(starsGeo, starsMat);
scene.add(stars);

// Axes helper sincronizado: se recreará después de rotar el grupo para coincidir visualmente
let axes = new THREE.AxesHelper(1.5);
axes.name = 'modelAxes';

// Axes para modo solo planeta
let planetAxes = new THREE.AxesHelper(1.5);
planetAxes.name = 'planetAxes';
planetAxes.visible = false;
scene.add(planetAxes);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(VIEWER_CAMERA_TARGET.x, VIEWER_CAMERA_TARGET.y, VIEWER_CAMERA_TARGET.z);
controls.update();

// Estado y utilidades para Cámara Libre (PointerLock + WASD)
let pointerControls = null;
let isFreeCam = false;
const moveState = { forward:false, backward:false, left:false, right:false, up:false, down:false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const FREE_CAM_ACCEL = 25.0;  // aceleración
const FREE_CAM_DAMP = 10.0;   // amortiguación
// Velocidad de giro (yaw/pitch) controlada por flechas
const KEY_LOOK_SPEED = 1.5;
// Estado de flechas para rotación (no movimiento)
const lookState = { left:false, right:false, up:false, down:false };
// Acumuladores de yaw/pitch para cámara libre (evitan roll)
let freeCamYaw = 0;
let freeCamPitch = 0;

function onKeyDown(e) {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  switch (e.code) {
    // Movimiento (WASD + elevación)
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'Space': moveState.up = true; break;
    case 'ShiftLeft':
    case 'ShiftRight': moveState.down = true; break;
    case 'KeyE': moveState.up = true; break;
    case 'KeyQ': moveState.down = true; break;
    // Flechas: rotación (NO movimiento)
    case 'ArrowLeft': lookState.left = true; break;
    case 'ArrowRight': lookState.right = true; break;
    case 'ArrowUp': lookState.up = true; break;
    case 'ArrowDown': lookState.down = true; break;
  }
}

function onKeyUp(e) {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  switch (e.code) {
    // Movimiento (WASD + elevación)
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'Space': moveState.up = false; break;
    case 'ShiftLeft':
    case 'ShiftRight': moveState.down = false; break;
    case 'KeyE': moveState.up = false; break;
    case 'KeyQ': moveState.down = false; break;
    // Flechas: rotación
    case 'ArrowLeft': lookState.left = false; break;
    case 'ArrowRight': lookState.right = false; break;
    case 'ArrowUp': lookState.up = false; break;
    case 'ArrowDown': lookState.down = false; break;
  }
}

function enableFreeCam() {
  if (isFreeCam) return;
  isFreeCam = true;
  controls.enabled = false;
  pointerControls = new PointerLockControls(camera, renderer.domElement);
  scene.add(pointerControls.getObject());
  const clickToLock = () => { pointerControls.lock(); };
  renderer.domElement.addEventListener('click', clickToLock);
  pointerControls.__clickToLock = clickToLock;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // Inicializar yaw/pitch desde orientación actual
  try {
    const yawObj = pointerControls.getObject();
    const pitchObj = yawObj.children && yawObj.children[0] ? yawObj.children[0] : null;
    freeCamYaw = yawObj.rotation.y;
    freeCamPitch = pitchObj ? pitchObj.rotation.x : camera.rotation.x;
    camera.up.set(0,1,0);
    camera.rotation.z = 0;
  } catch (e) {}
}

function disableFreeCam() {
  if (!isFreeCam) return;
  isFreeCam = false;
  try { window.removeEventListener('keydown', onKeyDown); } catch (e) {}
  try { window.removeEventListener('keyup', onKeyUp); } catch (e) {}
  if (pointerControls) {
    try { pointerControls.unlock?.(); } catch (e) {}
    try { scene.remove(pointerControls.getObject()); } catch (e) {}
    try {
      const clickToLock = pointerControls.__clickToLock;
      if (clickToLock) renderer.domElement.removeEventListener('click', clickToLock);
    } catch (e) {}
    pointerControls = null;
  }
  // Restaurar cámara y OrbitControls
  controls.enabled = true;
  camera.position.set(VIEWER_CAMERA_POS.x, VIEWER_CAMERA_POS.y, VIEWER_CAMERA_POS.z);
  controls.target.set(VIEWER_CAMERA_TARGET.x, VIEWER_CAMERA_TARGET.y, VIEWER_CAMERA_TARGET.z);
  controls.update();
}

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
  // sincronizar planeta de fondo al cargar una nave (no mostrar nada si no hay selección)
  try {
    if (!lastPlanetKey || lastPlanetKey === 'none') {
      planet.visible = false;
    } else {
      applyBackgroundPlanet(lastPlanetKey); // re-aplica textura/tamaño si recargamos
    }
  } catch (e) {}
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
      // Re-creamos los ejes del modelo manteniendo el estado de visibilidad previo
      const oldAxes = modelGroup.getObjectByName('modelAxes');
      let desiredVisible = true;
      if (oldAxes) {
        desiredVisible = oldAxes.visible; // si estaban ocultos, conservamos ese estado
        modelGroup.remove(oldAxes);
      }
      axes = new THREE.AxesHelper(1.5);
      axes.name = 'modelAxes';
      modelGroup.add(axes);
      // Si existe el checkbox lo usamos como fuente de verdad final
      const axesToggleEl = document.getElementById('axesToggle');
      if (axesToggleEl) {
        desiredVisible = axesToggleEl.checked;
      }
      axes.visible = desiredVisible;
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
    const checked = e.target.checked;
    axes.visible = checked && !planetOnlyMode;
    planetAxes.visible = checked && planetOnlyMode;
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

// Selección de planeta de fondo (permanece detrás de cualquier nave cargada)
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

function applyBackgroundPlanet(key) {
  if (!key || key === 'none') {
  planet.visible = false; // oculto totalmente si 'none'
  return;
  }
  planet.visible = true; // mostrar sólo si hay planeta elegido
  // Cargar textura y ajustar tamaño
  const texPath = `../textures/${key}.jpg`;
  const loader = new THREE.TextureLoader();
  loader.load(texPath, (tex) => {
    // Reemplazamos material para evitar fugas (dispose material/geometry previos)
    try { planet.material.map?.dispose(); planet.material.dispose(); } catch (e) {}
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.05 });
    planet.material = mat;
  });
  const size = planetSizes[key] || 0.8;
  // Reemplazamos geometría para reflejar el nuevo tamaño
  try { planet.geometry.dispose(); } catch (e) {}
  planet.geometry = new THREE.SphereGeometry(size, 48, 48);
  // Ajustar posición según modo
  if (planetOnlyMode) {
    planet.position.set(0, 0, 0);
  } else {
    planet.position.copy(BACKGROUND_PLANET_POS);
  }
}

if (planetSelect) {
  // Estado inicial coherente al recargar: leer valor del combo (por defecto 'none')
  try {
    lastPlanetKey = planetSelect.value || 'none';
    if (lastPlanetKey !== 'none') applyBackgroundPlanet(lastPlanetKey); else planet.visible = false;
  } catch (e) {}
  planetSelect.addEventListener('change', (e) => {
    const v = e.target.value;
    lastPlanetKey = v;
    applyBackgroundPlanet(v);
  });
}

// === Modo "Solo planeta" ===
let planetOnlyMode = false;
function enablePlanetOnlyMode() {
  planetOnlyMode = true;
  modelGroup.visible = false;
  // Ocultar opción 'none' del combo y forzar selección válida
  const planetSelect = document.getElementById('planetSelect');
  if (planetSelect) {
    const noneOpt = planetSelect.querySelector('option[value="none"]');
    if (noneOpt) noneOpt.hidden = true;
    if (!planetSelect.value || planetSelect.value === 'none') {
      planetSelect.value = 'mercury';
      lastPlanetKey = 'mercury';
      applyBackgroundPlanet('mercury');
    }
  }
  // Centrar planeta si existe selección
  if (lastPlanetKey && lastPlanetKey !== 'none') {
    planet.position.set(0, 0, 0);
    planet.visible = true;
  } else {
    planet.visible = false;
  }
  const axesToggleEl = document.getElementById('axesToggle');
  // Colocar los ejes igual que en la nave: misma posición y orientación
  planetAxes.position.set(0, 0, 0);
  try { planetAxes.rotation.copy(modelGroup.rotation); } catch (e) {}
  planetAxes.visible = !!(axesToggleEl?.checked);
  axes.visible = false;
  infoEl.textContent = lastPlanetKey && lastPlanetKey !== 'none' ? `Solo planeta: ${lastPlanetKey}` : 'Solo planeta: selecciona un planeta';
}

function disablePlanetOnlyMode() {
  planetOnlyMode = false;
  modelGroup.visible = true;
  // Volver a mostrar la opción 'none' en el combo
  const planetSelect = document.getElementById('planetSelect');
  if (planetSelect) {
    const noneOpt = planetSelect.querySelector('option[value="none"]');
    if (noneOpt) noneOpt.hidden = false;
  }
  const axesToggleEl = document.getElementById('axesToggle');
  // Restaurar orientación original de ejes del modelo (ya están hijos del group)
  axes.visible = !!(axesToggleEl?.checked);
  planetAxes.visible = false;
  // Restaurar planeta como fondo
  if (lastPlanetKey && lastPlanetKey !== 'none') {
    planet.position.copy(BACKGROUND_PLANET_POS);
    planet.visible = true;
  } else {
    planet.visible = false;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (isFreeCam && pointerControls) {
    // amortiguar
    velocity.x -= velocity.x * FREE_CAM_DAMP * delta;
    velocity.y -= velocity.y * FREE_CAM_DAMP * delta;
    velocity.z -= velocity.z * FREE_CAM_DAMP * delta;
    // dirección normalizada (diagonales no más rápidas)
    direction.z = (moveState.forward ? 1 : 0) - (moveState.backward ? 1 : 0);
    direction.x = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);
    direction.y = (moveState.up ? 1 : 0) - (moveState.down ? 1 : 0);
    if (direction.lengthSq() > 0) direction.normalize();
    // aplicar aceleración
    velocity.x += direction.x * FREE_CAM_ACCEL * delta;
    velocity.y += direction.y * FREE_CAM_ACCEL * delta;
    velocity.z += direction.z * FREE_CAM_ACCEL * delta;
    // mover
    pointerControls.moveRight(velocity.x * delta);
    pointerControls.moveForward(velocity.z * delta);
    pointerControls.getObject().position.y += velocity.y * delta;
    // Rotación con flechas (yaw/pitch) sin mover la cámara
    const yawDelta = (lookState.right ? 1 : 0) - (lookState.left ? 1 : 0);
    const pitchDelta = (lookState.up ? 1 : 0) - (lookState.down ? 1 : 0);
    // Actualizar yaw/pitch acumulados desde flechas (sin cambiar posición)
    if (yawDelta !== 0 || pitchDelta !== 0) {
      const step = KEY_LOOK_SPEED * delta;
      freeCamYaw -= yawDelta * step;     // Izq(+)/Der(-) ya contemplado con signos arriba
      freeCamPitch += pitchDelta * step; // Arriba(+)=mira arriba, Abajo(-)=mira abajo
      const limit = Math.PI / 2 - 0.01;
      freeCamPitch = Math.max(-limit, Math.min(limit, freeCamPitch));
      // Aplicar sin roll
      const yawObj = pointerControls.getObject();
      yawObj.rotation.y = freeCamYaw;
      const pitchObj = yawObj.children && yawObj.children[0] ? yawObj.children[0] : null;
      if (pitchObj) {
        pitchObj.rotation.x = freeCamPitch;
      } else {
        camera.rotation.x = freeCamPitch;
      }
      camera.rotation.z = 0;
      camera.up.set(0,1,0);
    }
  }
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

// Toggle de cámara libre desde UI
// Cámara libre: desactivada temporalmente (UI oculta). Si existiera el toggle, se ignora.
const freeCamToggle = document.getElementById('freeCamToggle');
if (freeCamToggle) {
  freeCamToggle.checked = false;
  freeCamToggle.disabled = true;
}
// Asegurar que quede deshabilitada a nivel de lógica
if (isFreeCam) {
  try { disableFreeCam(); } catch (e) {}
}

// Botón modo solo planeta (se añadirá en el HTML)
const planetOnlyBtn = document.getElementById('planetOnlyBtn');
if (planetOnlyBtn) {
  planetOnlyBtn.addEventListener('click', () => {
    if (!planetOnlyMode) {
      enablePlanetOnlyMode();
      planetOnlyBtn.textContent = 'Mostrar nave';
    } else {
      disablePlanetOnlyMode();
      planetOnlyBtn.textContent = 'Solo planeta (centrar)';
    }
  });
}
