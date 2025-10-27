import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';

let loader = new GLTFLoader();
let current = null;

function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((c) => {
    if (c.isMesh) {
      c.geometry?.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose();
      }
    }
  });
}

/**
 * Load a GLB into the provided parent group. If a previous model was loaded, it will be removed and disposed.
 * The loaded model will be attached as child with name 'loadedShip'.
 * @param {THREE.Group} parent
 * @param {string} url - path to the .glb file
 * @returns {Promise<THREE.Object3D>} resolves to the loaded scene
 */
export function loadInto(parent, url) {
  return new Promise((resolve, reject) => {
    if (!parent) return reject(new Error('Parent group required'));

    // remove previous
    const prev = parent.getObjectByName('loadedShip');
    if (prev) {
      parent.remove(prev);
      disposeObject(prev);
    }

    loader.load(url, (gltf) => {
      const scene = gltf.scene || gltf.scenes[0];
      if (!scene) return reject(new Error('Modelo GLB sin escena'));
      scene.name = 'loadedShip';
      // default orientation/position preserved; caller may adjust
      parent.add(scene);

      // Center the model on the parent's origin so the visual matches the collider
      try {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.length() > 0.001) {
          const center = new THREE.Vector3();
          box.getCenter(center);
          scene.position.sub(center);
        }
      } catch (e) {
        // ignore centering errors for exotic objects
      }

      // Make the model a bit more "visual": enable shadows and tweak standard materials
      scene.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          const mat = c.material;
          if (mat) {
            const mats = Array.isArray(mat) ? mat : [mat];
            mats.forEach((m) => {
              // Only touch standard/physical materials to avoid breaking special shaders
              if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
                // keep a tiny emissive/rim effect so the ship stands out
                try {
                  if (!m.userData) m.userData = {};
                  if (!m.userData.__original) {
                    m.userData.__original = {
                      roughness: m.roughness ?? 1,
                      metalness: m.metalness ?? 0,
                    };
                  }
                  m.emissive = m.emissive || new THREE.Color(0x000000);
                  m.emissive.add(new THREE.Color(0x101020));
                  m.emissiveIntensity = (m.emissiveIntensity || 0) + 0.4;
                  m.roughness = Math.max(0, (m.roughness ?? 1) - 0.15);
                  m.metalness = Math.min(1, (m.metalness ?? 0) + 0.05);
                } catch (e) {
                  // ignore any material mutations that fail for exotic materials
                }
              }
            });
          }
        }
      });

      // Add a small point light attached to the parent so the ship is more visible
      try {
        // remove existing helper light if present
        const prevLight = parent.getObjectByName('shipInnerLight');
        if (prevLight) parent.remove(prevLight);
        const inner = new THREE.PointLight(0xffffff, 0.7, 6);
        inner.name = 'shipInnerLight';
        inner.position.set(0, 0.8, 1);
        parent.add(inner);
      } catch (e) {
        // ignore if THREE not available or light creation fails
      }
      current = scene;
      resolve(scene);
    }, undefined, (err) => {
      reject(err);
    });
  });
}

export function setScaleOnParent(parent, scale) {
  const obj = parent.getObjectByName('loadedShip');
  if (obj) obj.scale.setScalar(scale);
}

export function setPositionOnParent(parent, x, y, z) {
  const obj = parent.getObjectByName('loadedShip');
  if (obj) obj.position.set(x, y, z);
}

export function setRotationOnParent(parent, x, y, z) {
  const obj = parent.getObjectByName('loadedShip');
  if (obj) obj.rotation.set(x || 0, y || 0, z || 0);
}

export function getCurrentName(parent) {
  const obj = parent.getObjectByName('loadedShip');
  return obj ? obj.name : null;
}

export function disposeCurrent(parent) {
  const obj = parent.getObjectByName('loadedShip');
  if (obj) {
    parent.remove(obj);
    disposeObject(obj);
  }
  // also remove any auxiliary lights/sprites we added when loading
  const l = parent.getObjectByName('shipInnerLight');
  if (l) parent.remove(l);
}
