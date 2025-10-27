import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js";


// Escena y cámara
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 50);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Luz del Sol
const sunLight = new THREE.PointLight(0xffffff, 2, 0);
sunLight.position.set(0,0,0);
sunLight.castShadow = true;
scene.add(sunLight);

// Fondo de estrellas
const starGeometry = new THREE.BufferGeometry();
const starCount = 10000;
const positions = [];
for(let i=0;i<starCount;i++){
  positions.push((Math.random()-0.5)*2000);
  positions.push((Math.random()-0.5)*2000);
  positions.push((Math.random()-0.5)*2000);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({color:0xffffff}));
scene.add(stars);

// Sol
const sunTexture = new THREE.TextureLoader().load('textures/sun.jpg');
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(3, 32, 32),
  new THREE.MeshBasicMaterial({map:sunTexture})
);
scene.add(sunMesh);

// Planetas
const planetData = [
  { name:"Mercurio", size:0.3, dist:5, texture:'textures/mercury.jpg', info:'Mercurio: planeta más cercano al sol.' },
  { name:"Venus", size:0.6, dist:7, texture:'textures/venus.jpg', info:'Venus: planeta muy caliente con atmósfera densa.' },
  { name:"Tierra", size:0.65, dist:10, texture:'textures/earth.jpg', info:'Tierra: nuestro planeta azul con vida.' },
  { name:"Marte", size:0.35, dist:13, texture:'textures/mars.jpg', info:'Marte: planeta rojo, con grandes volcanes.' },
  { name:"Júpiter", size:1.2, dist:18, texture:'textures/jupiter.jpg', info:'Júpiter: gigante gaseoso con la Gran Mancha Roja.' },
  { name:"Saturno", size:1, dist:23, texture:'textures/saturn.jpg', info:'Saturno: famoso por sus anillos.' },
  { name:"Urano", size:0.7, dist:28, texture:'textures/uranus.jpg', info:'Urano: planeta azul verdoso, gira de lado.' },
  { name:"Neptuno", size:0.65, dist:33, texture:'textures/neptune.jpg', info:'Neptuno: planeta azul, muy frío y ventoso.' }
];

const planets = [];
planetData.forEach(data => {
  const texture = new THREE.TextureLoader().load(data.texture);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(data.size, 32, 32),
    new THREE.MeshStandardMaterial({map:texture})
  );
  mesh.position.set(data.dist, 0, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = data;
  scene.add(mesh);
  planets.push(mesh);
});

// Info Box
const infoBox = document.getElementById('infoBox');
const infoContent = document.getElementById('infoContent');
document.getElementById('closeBtn').addEventListener('click', () => {
  infoBox.style.display = 'none';
});

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('click', event=>{
  mouse.x = (event.clientX / window.innerWidth)*2-1;
  mouse.y = -(event.clientY / window.innerHeight)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets);
  if(intersects.length>0){
    const planet = intersects[0].object;
    infoBox.style.display = 'block';
    infoContent.innerHTML = `<strong>${planet.userData.name}</strong><br>${planet.userData.info}`;
  }
});

// Animación
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  planets.forEach(p=>{
    p.rotation.y += 0.01;
    const angle = Date.now()*0.00005*p.userData.dist;
    p.position.x = Math.cos(angle)*p.userData.dist;
    p.position.z = Math.sin(angle)*p.userData.dist;
  });
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
