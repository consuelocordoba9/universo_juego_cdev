// Simple SoundManager module
// - Busca archivos en la carpeta 'sonidos/' por defecto
// - Intenta extensiones comunes si no se proporciona extensión
// - Permite reproducir, parar, hacer loop y ajustar volúmenes desde código (sin UI)

const DEFAULT_EXTS = ['.mp3', '.ogg', '.wav', '.m4a'];
// Volúmenes por defecto (si no existe en localStorage)
const DEFAULT_VOLUMES = {
  movimiento: 0.8,
  exposion: 1.0,
  fondoMenu: 0.6,
  sonidoNave: 0.2, // bajar volumen por pedido
  cuentaRegresiva: 0.9,
  victoria: 0.8,
  derrota: 0.8,
  choqueexito: 0.9,
  curacion: 0.8
};

class SoundManager {
  constructor(basePath = 'sonidos/') {
    this.basePath = basePath.endsWith('/') ? basePath : basePath + '/';
    this.sounds = {}; // name -> HTMLAudioElement
    this.volumes = {}; // name -> 0..1 (logical volume, multiplied by globalVolume)
    this.globalVolume = parseFloat(localStorage.getItem('sound_global') || '1') || 1;
  }

  // Try loading from multiple base names (without extension) into the same sound name
  async loadFallback(name, baseNames, opts = {}) {
    for (const base of baseNames) {
      const ok = await this.load(name, base, opts);
      if (ok) return true;
    }
    console.warn(`[SoundManager] Failed to load sound '${name}' from candidates:`, baseNames);
    return false;
  }

  _hasExtension(name) {
    return /\.[a-z0-9]{2,4}$/i.test(name);
  }

  // load a single sound; fileName may include extension or not
  load(name, fileName, opts = {}) {
    return new Promise((resolve) => {
      const tryExts = this._hasExtension(fileName) ? [''] : DEFAULT_EXTS.slice();
      const base = fileName;
      const tryNext = () => {
        if (!tryExts.length) return resolve(false);
        const ext = tryExts.shift();
        const src = this.basePath + base + ext;
        const audio = new Audio();
        audio.src = src;
        audio.preload = 'auto';
        audio.loop = !!opts.loop;
        let vol = 1;
        if (typeof opts.volume === 'number') {
          vol = opts.volume;
        } else {
          const stored = localStorage.getItem('sound_vol_' + name);
          vol = stored !== null ? parseFloat(stored) : (DEFAULT_VOLUMES[name] ?? 1);
        }
        this.volumes[name] = vol;
        audio.volume = Math.max(0, Math.min(1, vol * this.globalVolume));

        const onLoaded = () => {
          cleanup();
          this.sounds[name] = audio;
          resolve(true);
        };
        const onError = () => {
          cleanup();
          // try next extension
          tryNext();
        };

        const cleanup = () => {
          audio.removeEventListener('canplaythrough', onLoaded);
          audio.removeEventListener('error', onError);
        };

        audio.addEventListener('canplaythrough', onLoaded, { once: true });
        audio.addEventListener('error', onError, { once: true });
        // start loading
        audio.load();
      };
      tryNext();
    });
  }

  // convenience: load the expected sounds
  async loadAllDefaults() {
    await this.load('movimiento', 'movimiento');
    // Support both 'exposion' (as solicitado) and 'explosion' (si el archivo viene con L)
    await this.loadFallback('exposion', ['exposion', 'explosion']);
    await this.load('fondoMenu', 'fondoMenu');
    await this.load('sonidoNave', 'sonidoNave');
    await this.load('cuentaRegresiva', 'cuentaRegresiva');
    await this.load('victoria', 'victoria');
    await this.load('derrota', 'derrota');
    await this.load('choqueexito', 'choqueexito');
    await this.load('curacion', 'curacion');
  }

  // Precalienta el audio para evitar latencia al primer play (llamar tras interacción del usuario)
  async prime(name) {
    const a = this.sounds[name];
    if (!a) return false;
    try {
      const oldVol = a.volume;
      a.volume = 0; // silencio temporal
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') await p.catch(()=>{});
      // pequeña espera para iniciar el buffer
      await new Promise(r => setTimeout(r, 60));
      a.pause();
      a.currentTime = 0;
      a.volume = oldVol;
      return true;
    } catch (e) { return false; }
  }

  play(name, opts = {}) {
    const a = this.sounds[name];
    if (!a) {
      // Fallback beep for countdown if the file is missing
      if (name === 'cuentaRegresiva') {
        try { this._beep({ freq: 920, duration: 0.12, volume: (this.volumes[name] ?? 0.9) * this.globalVolume }); } catch(e) {}
      }
      return;
    }
    try {
      if (opts.reset) a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') p.catch(() => {});
    } catch (e) {}
  }

  stop(name) {
    const a = this.sounds[name];
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch(e) {}
  }

  loop(name, yes = true) {
    const a = this.sounds[name];
    if (!a) return;
    a.loop = !!yes;
  }

  setVolume(name, v) {
    v = Math.max(0, Math.min(1, v || 0));
    this.volumes[name] = v;
    localStorage.setItem('sound_vol_' + name, String(v));
    const a = this.sounds[name];
    if (a) a.volume = v * this.globalVolume;
  }

  getVolume(name) {
    return this.volumes[name] ?? 1;
  }

  ensureAudible(name, min = 0.3) {
    const prev = this.getVolume(name);
    if ((prev * this.globalVolume) < min) {
      this.setVolume(name, Math.min(1, min / Math.max(0.01, this.globalVolume)));
    }
    return prev;
  }

  changeVolume(name, delta) {
    const cur = this.volumes[name] || 1;
    this.setVolume(name, Math.max(0, Math.min(1, cur + delta)));
  }

  setGlobalVolume(v) {
    this.globalVolume = Math.max(0, Math.min(1, v || 0));
    localStorage.setItem('sound_global', String(this.globalVolume));
    for (const n in this.sounds) {
      const a = this.sounds[n];
      if (!a) continue;
      a.volume = (this.volumes[n] || 1) * this.globalVolume;
    }
  }

  // hidden APIs to increase/decrease volumes programmatically
  increaseVolume(name, step = 0.05) { this.changeVolume(name, Math.abs(step)); }
  decreaseVolume(name, step = 0.05) { this.changeVolume(name, -Math.abs(step)); }

  // Simple beep fallback using WebAudio API (for lightweight cues like countdown)
  _beep({ freq = 880, duration = 0.1, volume = 0.5 } = {}) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this._ctx) this._ctx = new AC();
      const ctx = this._ctx;
      // Ensure context is running (user gesture should have occurred already)
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(()=>{});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = Math.max(0, Math.min(1, volume));
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      // quick attack/decay envelope to avoid clicks
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.01);
      gain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.02, duration));
      osc.start(now);
      osc.stop(now + Math.max(0.03, duration + 0.01));
      // cleanup
      osc.onended = () => {
        try { osc.disconnect(); gain.disconnect(); } catch(e) {}
      };
    } catch (e) {}
  }
}

const manager = new SoundManager('sonidos');
export default manager;
