// Configuración centralizada de presets para las naves.
// Modifica aquí las escalas y posiciones por defecto para cada modelo.

export const shipPresets = {
  // use the filename as key (basename of the .glb)
  // rotation is [rx,ry,rz] in radians. autoRotate = true will make the
  // model rotate automatically (applies in preview and, optionally, in-game).
  'ship1.glb': { scale: 0.03, position: [0, 0, 0], rotation: [-Math.PI/2, -Math.PI/2, 0], autoRotate: false, colliderRadius: 0.35 },
  'ship2.glb': { scale: 0.95, position: [0, 0, 1.4], rotation: [-Math.PI / 2, Math.PI / 2, 0], autoRotate: true, colliderRadius: 0.45 },
  'ship3.glb': { scale: 0.08, position: [0, 0.5, 0], rotation: [Math.PI, 0, 0], autoRotate: true, colliderRadius: 0.35 }
};

/**
 * Get preset by a URL or filename. Returns default if none found.
 * @param {string} url
 */
export function getPresetForUrl(url) {
  if (!url) return { scale: 1, position: [0, 0, 0], rotation: [0, 0, 0], autoRotate: false };
  const name = url.split('/').pop();
  const p = shipPresets[name];
  if (!p) return { scale: 1, position: [0, 0, 0], rotation: [0, 0, 0], autoRotate: false };
  return {
    scale: p.scale ?? 1,
    position: p.position ?? [0, 0, 0],
    rotation: p.rotation ?? [0, 0, 0],
    autoRotate: !!p.autoRotate,
    colliderRadius: p.colliderRadius ?? 0.45
  };
}
