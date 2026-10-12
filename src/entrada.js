// Voz del narrador en la pantalla de entrada: mientras la gente pone su nombre o duda de bando,
// le hace preguntas "sutiles". Empieza con el primer toque (el móvil no deja sonar antes).
import { hablar, voces, desbloquearAudio, callarNPCs, detenerNarracion } from './voces.js?v=20261012-audio2';
import { $ } from './ui.js?v=20261012-audio2';

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
let empezado = false, generacion = 0;

const enEntrada = () => { const l = $('#lobby'); return l && !l.classList.contains('oculto') && getComputedStyle(l).display !== 'none'; };

function subtitulo(texto) {
  let p = $('#lobby-voz');
  if (!p) { p = document.createElement('p'); p.id = 'lobby-voz'; $('#lobby-error')?.before(p); }
  p.textContent = texto ? '🗣️ ' + texto : '';
}

async function bucle(turno) {
  let i = 0;
  await espera(100);
  while (enEntrada() && turno === generacion) {
    const t = FRASES[i++ % FRASES.length];
    subtitulo(t);
    callarNPCs(true);
    const dur = await hablar(t, { canal: 'tutorial', volumen: 1, vigente: () => enEntrada() && turno === generacion });
    await espera(Math.max(3000, (dur || t.length / 14) * 1000) + PAUSA_MS);
  }
  if (turno === generacion) { subtitulo(''); callarNPCs(false); empezado = false; }
}

export function iniciarVozEntrada() {
  const arrancar = async () => {
    if (empezado || !enEntrada() || !voces.activado) return;
    empezado = true;
    const turno = ++generacion;
    const listo = await desbloquearAudio();
    if (!listo || !enEntrada() || turno !== generacion) { empezado = false; return; }
    bucle(turno);
  };
  // Se cancela la voz de entrada al cambiar de pantalla, incluso mientras carga.
  new MutationObserver(() => {
    if (!enEntrada() && empezado) {
      generacion++; empezado = false; detenerNarracion(); callarNPCs(false); subtitulo('');
    }
  }).observe($('#lobby'), { attributes: true, attributeFilter: ['class'] });
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, arrancar, { capture: true });
}
