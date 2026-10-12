// Voz del narrador en la pantalla de entrada: mientras la gente pone su nombre o duda de bando,
// le hace preguntas "sutiles". Empieza con el primer toque (el móvil no deja sonar antes).
import { hablar } from './voces.js';
import { $ } from './ui.js';

const FRASES = [
  '¿Qué eres, un puto rojo de mierda asqueroso, o una persona decente que trabaja en Indra o en Deloitte?',
  '¿Tú crees que las casas crecen en los árboles, o en la oferta y la demanda?',
  'Venga, escribe tu nombre, que no tenemos todo el día. Bueno, los de la acampada sí.',
  '¿Acampada en Sol o planta doce con café de máquina? Elige, que no muerde.',
  'Si eliges la izquierda, trae tienda. Si eliges la derecha, trae corbata.',
  'Piénsatelo bien, que aquí cambiarse de bando se llama ser tránsfuga.',
];
const PAUSA_MS = 4000;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let empezado = false;

const enEntrada = () => { const l = $('#lobby'); return l && !l.classList.contains('oculto') && getComputedStyle(l).display !== 'none'; };

function subtitulo(texto) {
  let p = $('#lobby-voz');
  if (!p) { p = document.createElement('p'); p.id = 'lobby-voz'; $('#lobby-error')?.before(p); }
  p.textContent = texto ? '🗣️ ' + texto : '';
}

async function bucle() {
  let i = 0;
  await espera(600);
  while (enEntrada()) {
    const t = FRASES[i++ % FRASES.length];
    subtitulo(t);
    const dur = await hablar(t, { canal: 'tutorial', volumen: 1 });
    await espera(Math.max(3000, (dur || t.length / 14) * 1000) + PAUSA_MS);
  }
  subtitulo('');
}

export function iniciarVozEntrada() {
  const arrancar = () => { if (empezado || !enEntrada()) return; empezado = true; bucle(); };
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, arrancar, { capture: true });
}
