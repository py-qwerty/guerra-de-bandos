// Voces pregeneradas con ElevenLabs, guardadas en la carpeta audio/ (nada se genera en directo).
// audio/voces.json: { izquierda: { "FRASE": ["audio/sol-xxx.mp3", ...] }, derecha: {...} }  (2 voces por frase)
//
// Se reproducen con Web Audio: tras el primer toque en pantalla el audio queda desbloqueado
// (en iPhone/Android un <audio> lanzado por código sin toque se bloquea y por eso algunas frases no sonaban).

let mapa = null;
let activado = true;
try { activado = localStorage.getItem('gdb_voces') !== 'off'; } catch {}

const carga = fetch('audio/voces.json?v=20261012-audio2').then((r) => (r.ok ? r.json() : {})).then((m) => (mapa = m)).catch(() => (mapa = {}));

let ctx = null;
export async function desbloquearAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  } catch { return false; }
}
const desbloquear = () => { desbloquearAudio(); };
for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, desbloquear, { passive: true });

const buffers = new Map();
function buffer(url) {
  if (!buffers.has(url)) {
    buffers.set(url, fetch(url).then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, ko) => ctx.decodeAudioData(b, ok, ko))).catch(() => null));
  }
  return buffers.get(url);
}

// Canales: el ambiente (memes) habla de uno en uno; la acción (golpes, gritos) hasta 2 a la vez
const LIMITE = { ambiente: 1, accion: 2, tutorial: 1 };
const ocupados = { ambiente: 0, accion: 0, tutorial: 0 };
let npcCallados = false;
const sonandoNPC = new Set();
const narracion = new Set();
export function detenerNarracion() {
  for (const fuente of narracion) { try { fuente.stop(); } catch {} }
  narracion.clear();
}
/** Mientras habla el tutorial, los NPCs se callan (y se corta lo que estuvieran diciendo). */
export function callarNPCs(si) {
  npcCallados = si;
  if (si) for (const s of sonandoNPC) { try { s.stop(); } catch {} }
}

export const voces = {
  get activado() { return activado; },
  alternar() { activado = !activado; desbloquear(); try { localStorage.setItem('gdb_voces', activado ? 'on' : 'off'); } catch {} return activado; },
  /** ¿Puede sonar ya algo en este canal? (si no, mejor esperar para que bocadillo y voz vayan juntos) */
  libre(canal = 'ambiente') { return !activado || !ctx || ctx.state !== 'running' || ocupados[canal] < LIMITE[canal]; },
  get sonidoActivo() { return activado && ctx?.state === 'running'; },
};

/** Dice la frase con una de sus dos voces al azar. */
export async function hablar(texto, { volumen = 0.8, bando, canal = 'accion', vigente = () => true } = {}) {
  if (!vigente() || !activado || !ctx || ctx.state !== 'running' || ocupados[canal] >= LIMITE[canal]) return;
  if (npcCallados && canal !== 'tutorial') return;
  await carga;
  if (!vigente() || !activado || ctx?.state !== 'running' || ocupados[canal] >= LIMITE[canal]) return;
  const lista = (bando && mapa?.[bando]?.[texto]) || mapa?.izquierda?.[texto] || mapa?.derecha?.[texto] || mapa?.tutorial?.[texto] || mapa?.entrada?.[texto];
  if (!lista?.length) { console.warn('[voces] sin audio para:', texto); return; }
  ocupados[canal]++;
  let liberado = false;
  const liberar = () => { if (!liberado) { liberado = true; ocupados[canal]--; } };
  try {
    const buf = await buffer(lista[Math.floor(Math.random() * lista.length)]);
    if (!buf || !vigente() || !activado || (npcCallados && canal !== 'tutorial')) return liberar();
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = volumen;
    src.connect(g).connect(ctx.destination);
    if (canal !== 'tutorial') sonandoNPC.add(src);
    else narracion.add(src);
    src.onended = () => { sonandoNPC.delete(src); narracion.delete(src); liberar(); };
    setTimeout(liberar, buf.duration * 1000 + 500); // por si onended no llega
    src.start();
    return buf.duration; // segundos, para encadenar frases
  } catch { liberar(); }
}
