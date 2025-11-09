// Enciclopedia modular: construye un overlay con grilla de planetas
// No depende de Three.js. Solo DOM. Se monta dentro de #encyOverlay si existe.

import { planetData } from './planetData.js';

function ensureStyles() {
  if (document.getElementById('encyStyles')) return;
  const style = document.createElement('style');
  style.id = 'encyStyles';
  style.textContent = `
    #encyOverlay { background: radial-gradient(1200px 800px at 50% 50%, rgba(10,18,36,0.92), rgba(2,8,20,0.96)); }
    .ency-box { width: 920px; max-width: 96%; max-height: 86vh; overflow:auto; background: rgba(8,14,26,0.96); color: #eef6ff; border-radius: 14px; padding: 16px; box-shadow: 0 16px 60px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.06); }
    .ency-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
    .ency-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .ency-card { background: #0d1a33; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px; display:flex; flex-direction:column; gap:8px; }
    .ency-card h4 { margin: 8px 0 6px 0; font-size: 16px; }
    .ency-card img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; background:#071226; }
    .btn { background:#2a9d8f; border:none; color:#fff; border-radius:8px; padding:8px 12px; cursor:pointer; }
    .btn.secondary { background:#4a5568; }
    .btn.warning { background:#e76f51; }
    .ency-actions { display:flex; justify-content:flex-end; }
    /* Modal detalle */
    .ency-modal { position:fixed; inset:0; z-index:140; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.58); }
    .ency-modal-box { width:1024px; max-width:96%; max-height:90vh; overflow:auto; background:#08121f; color:#eef6ff; border-radius:12px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 22px 90px rgba(0,0,0,0.75); }
    .ency-modal-header { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid rgba(255,255,255,0.06); }
    .ency-modal-body { padding:16px 18px; display:grid; grid-template-columns: 360px 1fr; gap:18px; }
    .ency-modal-body img { width:100%; height:260px; object-fit:cover; border-radius:10px; background:#0b1a33; }
    .ency-stats { display:grid; grid-template-columns: repeat(2, minmax(140px, 1fr)); gap:8px 16px; margin-top:10px; font-size:14px; }
    .ency-stat { opacity:0.95; }
    .ency-facts { margin-top:12px; padding-left:18px; }
  `;
  document.head.appendChild(style);
}

export function mountEncyclopedia() {
  ensureStyles();
  let overlay = document.getElementById('encyOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'encyOverlay';
    overlay.style.display = 'none';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '130';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'ency-box';
  box.innerHTML = `
    <div class="ency-header">
      <h3 style="margin:0">Enciclopedia Planetaria</h3>
      <div style="display:flex; gap:8px">
        <input id="encySearch" type="search" placeholder="Buscar planeta..." style="padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:#0a1528; color:#fff; outline:none;" />
        <button id="encyClose" class="btn warning">Cerrar</button>
      </div>
    </div>
    <div id="encyGrid" class="ency-grid"></div>
  `;
  overlay.appendChild(box);

  const grid = box.querySelector('#encyGrid');
  const search = box.querySelector('#encySearch');
  const close = box.querySelector('#encyClose');

  function resolveTexturePath(path) {
    let texPath = path || '';
    if (typeof window !== 'undefined') {
      const inTests = window.location.pathname.includes('/pruebas/');
      if (inTests && texPath.startsWith('./')) texPath = '../' + texPath.slice(2);
    }
    return texPath;
  }

  function showDetail(d) {
    // elimina modal anterior si existe
    const old = document.querySelector('.ency-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.className = 'ency-modal';
    const box = document.createElement('div');
    box.className = 'ency-modal-box';
    box.innerHTML = `
      <div class="ency-modal-header">
        <h3 style="margin:0">${d.name}</h3>
        <button class="btn warning" data-close> Cerrar </button>
      </div>
      <div class="ency-modal-body">
        <img src="${resolveTexturePath(d.texture)}" alt="${d.name}">
        <div>
          <div style="font-size:15px; opacity:0.95; line-height:1.7;">${d.more || d.info || ''}</div>
          <div class="ency-stats">
            ${d.stats ? `
              <div class="ency-stat"><strong>Distancia media:</strong> ${d.stats.distanceAU} UA</div>
              <div class="ency-stat"><strong>Radio:</strong> ${d.stats.radiusKm} km</div>
              <div class="ency-stat"><strong>Masa:</strong> ${d.stats.mass10e24kg} ×10²⁴ kg</div>
              <div class="ency-stat"><strong>Duración del día:</strong> ${d.stats.dayHours} h</div>
              <div class="ency-stat"><strong>Año:</strong> ${d.stats.yearDays} días</div>
              <div class="ency-stat"><strong>Lunas:</strong> ${d.stats.moons}</div>
              <div class="ency-stat"><strong>Temperatura:</strong> ${d.stats.tempC} °C</div>
            ` : ''}
          </div>
          ${Array.isArray(d.facts) && d.facts.length ? `
            <div style="margin-top:12px; font-weight:700;">Curiosidades</div>
            <ul class="ency-facts">
              ${d.facts.map(f => `<li>${f}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `;
    modal.appendChild(box);
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || (e.target.dataset && e.target.dataset.close !== undefined)) modal.remove();
    });
    window.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ modal.remove(); window.removeEventListener('keydown', esc);} });
  }

  function render(list) {
    grid.innerHTML = '';
    list.forEach(d => {
      const card = document.createElement('div');
      card.className = 'ency-card';
      const img = document.createElement('img');
      img.src = resolveTexturePath(d.texture);
      img.alt = d.name;
      const h = document.createElement('h4');
      h.textContent = d.name;
      const p = document.createElement('div');
      p.textContent = d.info;
      const actions = document.createElement('div');
      actions.className = 'ency-actions';
      const moreBtn = document.createElement('button');
      moreBtn.className = 'btn';
      moreBtn.textContent = 'Más información';
      moreBtn.addEventListener('click', () => showDetail(d));
      actions.appendChild(moreBtn);

      card.appendChild(img); card.appendChild(h); card.appendChild(p); card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  render(planetData);

  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    const filtered = !q ? planetData : planetData.filter(p => p.name.toLowerCase().includes(q));
    render(filtered);
  });

  close?.addEventListener('click', () => hideEncyclopedia());
}

export function showEncyclopedia() {
  const overlay = document.getElementById('encyOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
}

export function hideEncyclopedia() {
  const overlay = document.getElementById('encyOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
}
