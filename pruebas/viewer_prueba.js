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

// Axes helper (will be attached to the modelGroup so its center matches the collision point)
const axes = new THREE.AxesHelper(1.5);
axes.name = 'modelAxes';

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.update();

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
    try { setPositionOnParent(modelGroup, ...(preset.position || [0, 0.2, 0])); } catch(e) {}
    try { setRotationOnParent(modelGroup, ...(preset.rotation || [0,0,0])); } catch(e) {}
  currentAutoRotate = !!preset.autoRotate;
  // Ensure preview shows ship standing upright (do not apply main game's parent tilt here)
  modelGroup.rotation.x = 0;
  // expose reference to loaded model for auto-rotate handling
  currentModel = modelGroup.getObjectByName('loadedShip');
    // update viewer collider radius to match preset
    try {
      const r = preset.colliderRadius || 0.45;
      viewerCollider.geometry.dispose();
      viewerCollider.geometry = new THREE.SphereGeometry(r, 12, 12);
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
