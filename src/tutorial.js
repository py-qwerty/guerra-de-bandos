// "Tutorial" a insultos: si alguien toca la pantalla sin sentido o no pulsa Construir/Atacar
// en un buen rato, una voz le llama jodido inútil y le explica cómo se juega.
import { hablar } from './voces.js';
import { $, aviso } from './ui.js';

const INSULTO = 'Jodido inútil.';
const TOQUES = ['Jodido inútil, eso es el fondo, no un botón. Los botones están abajo y no muerden.',
  '¿Sigues tocando el cielo? El cielo no es tuyo, inútil, es del casero.'];
const QUIETO = 'Llevas un rato sin hacer nada. ¿Eres del Juampe o qué? Construye o ataca, hostia ya.';
const EXPLICACION = [
  'A ver, pedazo de cabrón: pulsa Construir, eliges una tienda, un perroflauta o una planta de oficinas, y se coloca solita. Hasta tú puedes.',
  'Pulsa Atacar, eliges la munición y tu gente dispara sola. No hay que apuntar, que ya sabemos que no sabes.',
  'Arriba a la derecha tienes tus créditos del día. Gástalos, rácano, que mañana se recargan.',
  'Lo que rompes se queda roto para todos, así que rompe algo, coño, que para eso estás aquí.',
];

const TOQUES_SEGUIDOS = 4;      // toques en la pantalla...
const VENTANA_MS = 5000;        // ...en estos milisegundos = está tocando por tocar
const INACTIVO_MS = 120000;     // 2 minutos sin construir ni atacar
const DESCANSO_MS = 45000;      // entre bronca y bronca

let ultimaAccion = Date.now(), ultimaBronca = 0, toques = [], paso = 0, hablando = false;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function decir(texto) {
  const dur = await hablar(texto, { canal: 'tutorial', volumen: 1 });
  const ms = Math.max(2500, (dur || texto.length / 14) * 1000);
  aviso('🗣️ ' + texto, ms);
  await espera(ms + 300);
}

async function bronca(motivo) {
  const ahora = Date.now();
  if (hablando || ahora - ultimaBronca < DESCANSO_MS || $('#juego')?.classList.contains('oculto')) return;
  hablando = true; ultimaBronca = ahora;
  try {
    await decir(INSULTO);
    await decir(motivo === 'toques' ? TOQUES[Math.floor(Math.random() * TOQUES.length)] : QUIETO);
    // dos frases de explicación, rotando para que cada vez aprenda algo nuevo
    for (let i = 0; i < 2; i++) await decir(EXPLICACION[paso++ % EXPLICACION.length]);
  } finally { hablando = false; ultimaAccion = Date.now(); }
}

export function iniciarTutorialInsultos() {
  // pulsar Construir, Atacar o cualquier botón de juego cuenta como "hacer algo"
  document.querySelector('#acciones')?.addEventListener('click', () => { ultimaAccion = Date.now(); toques = []; }, true);
  document.querySelector('#modal')?.addEventListener('click', () => { ultimaAccion = Date.now(); }, true);
  document.querySelector('#phaser')?.addEventListener('pointerdown', () => {
    const t = Date.now();
    toques = toques.filter((x) => t - x < VENTANA_MS); toques.push(t);
    if (toques.length >= TOQUES_SEGUIDOS) { toques = []; bronca('toques'); }
  }, true);
  setInterval(() => { if (Date.now() - ultimaAccion > INACTIVO_MS) bronca('quieto'); }, 15000);
}
