import { iniciarAdmin } from './admin.js';
import { api } from './api.js?v=20261012-lobby';
import { fotoDe } from './imagenes.js';
import { voces } from './voces.js';
import { iniciarTutorialInsultos } from './tutorial.js';
import { iniciarVozEntrada } from './entrada.js';
import { crearJuego, MUNICION, MUNICIONES, PIEZAS, PRESUPUESTO } from './game.js?v=20261012-lobby';
import { $, aviso, modal, cerrarModal, esc } from './ui.js?v=20261012-lobby';
import { partidaCerrada, puedeReanudar } from './partida.js?v=20261012-resume';

const estado = { partida: null, yo: null, jugadores: [], bloques: [], escena: null, disparosHoy: 0 };

// ================= LOBBY =================
const err = (m) => ($('#lobby-error').textContent = m || '');
// Solo se recuerda la ronda elegida; nunca el token del jugador o de administración.
const claveRonda = 'gdb_ronda_elegida';
function leerRonda() { try { return JSON.parse(localStorage.getItem(claveRonda)); } catch { return null; } }
function recordarRonda(ronda) { try { localStorage.setItem(claveRonda, JSON.stringify(ronda)); } catch {} }


async function arrancar() {
  try {
    const jugador = await api.quienSoy();
    if (jugador) {
      const partida = await api.partida(jugador.partida.codigo);
      if (puedeReanudar(leerRonda(), partida, jugador.jugador_id)) return entrar(jugador);
      recordarRonda({ cerrada: true });
    }
  } catch (e) { err('No conecta con el servidor: ' + e.message); }

  for (const bando of ['izquierda', 'derecha']) {
    fotoDe(bando).then((f) => {
      if (!f) return;
      const card = document.querySelector(`.opcion[data-bando="${bando}"]`);
      const img = card.querySelector('img'); img.onload = () => pixelar(img); img.src = f.src;
      const a = card.querySelector('.credito'); a.textContent = '📷 ' + f.credito; a.href = f.pagina;
      a.onclick = (ev) => ev.stopPropagation();
    });
  }
}

document.querySelectorAll('.opcion').forEach((b) => (b.onclick = async () => {
  err();
  const nombre = $('#in-nombre').value.trim();
  if (!nombre) { err('Pon tu nombre antes de elegir bando'); $('#in-nombre').focus(); return; }
  try {
    const partida = await api.partida('general');
    if (!partida || !partida.activa) { err('La partida ha terminado. Espera a que el administrador la inicie.'); return; }
    const sesion = await api.entrar(b.dataset.bando, nombre);
    await api.renombrar(sesion.token, nombre);
    sesion.nombre = nombre;
    await entrar(sesion);
  }
  catch (e) { err(e.message); }
}));

// Convierte la foto real en pixel art: la reduce y la vuelve a ampliar sin suavizado
function pixelar(img) {
  try {
    const ancho = 96, alto = Math.round(img.naturalHeight * ancho / img.naturalWidth);
    const cv = document.createElement('canvas'); cv.width = ancho; cv.height = alto;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, ancho, alto);
    // paleta reducida para que parezca de 16 bits
    const d = ctx.getImageData(0, 0, ancho, alto);
    for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(d.data[i + k] / 40) * 40;
    ctx.putImageData(d, 0, 0);
    cv.className = 'foto-pixel'; img.replaceWith(cv);
  } catch { img.classList.add('ok'); }
}

iniciarAdmin(partida => {
  if (estado.partida?.id === partida.id) {
    if (partidaCerrada(estado.partida, partida)) return volverEntrada();
    estado.partida = partida; pintarEstado(); refrescar().catch(e => aviso(e.message));
  }
}, async (tipo, bando, partidaId) => {
  if (estado.escena) return estado.escena.slotPara(tipo, bando);
  // La administración también puede construir desde la entrada al juego.
  const bloques = await api.bloques(partidaId);
  const xs = tipo === 'planta' ? [1050,1140,1230,1320,1410] : Array.from({length:tipo === 'currante' ? 24 : 13}, (_,i) => (tipo === 'currante' ? 990 : 270)+i*(tipo === 'currante' ? 24 : 30));
  const ocupados = x => bloques.filter(b => b.tipo === tipo && Math.abs(b.x-x)<15).length;
  xs.sort((a,b) => ocupados(a)-ocupados(b));
  return { x: xs[0], y: 714 };
}, {
  jugador: () => estado.yo,
  ocupado: () => estado.escena?.modo !== 'ver',
  cambiar: async sesion => {
    const partida = await api.partida(sesion.partida.codigo);
    if (partidaCerrada(estado.partida, partida)) return volverEntrada();
    sesion.partida = partida;
    estado.yo = sesion;
    estado.partida = partida;
    if (estado.escena) estado.escena.ctx.bando = sesion.bando;
    estado.disparo = null;
    $('#btn-disparar').textContent = sesion.bando === 'izquierda' ? '🪨 Pedradas' : '🔫 Fuego';
    await refrescar();
  },
});
arrancar();
function pintarEstado() {
  const activa = estado.partida?.activa !== false;
  $('#hud-estado').textContent = activa ? 'En curso' : 'Terminada';
  $('#btn-construir').disabled = $('#btn-disparar').disabled = !activa;
}
function puedeJugar() {
  if (estado.partida?.activa !== false) return true;
  aviso('Partida terminada. Espera a que el administrador la inicie.'); return false;
}

// ================= JUEGO =================
async function entrar(s) {
  // La respuesta de entrar solo incluye id, codigo y nombre de la partida.
  // El estado y las fechas se leen de la partida completa, nunca de esa referencia.
  const partida = await api.partida(s.partida.codigo);
  if (!partida || partida.activa === false) return volverEntrada();
  s.partida = partida;
  recordarRonda({ id: partida.id, iniciada_at: partida.iniciada_at, jugador_id: s.jugador_id });
  estado.yo = s;
  estado.partida = s.partida;
  pintarEstado();
  $('#lobby').classList.add('oculto');
  $('#juego').classList.remove('oculto');

  // el bando real puede haber cambiado (tránsfuga)
  estado.jugadores = await api.jugadores(estado.partida.id);
  const yo = estado.jugadores.find((j) => j.id === s.jugador_id);
  if (yo) estado.yo.bando = yo.bando;

  $('#btn-disparar').textContent = estado.yo.bando === 'izquierda' ? '🪨 Pedradas' : '🔫 Fuego';
  try { await document.fonts.load('10px "Press Start 2P"'); } catch {}
  estado.juego = crearJuego({
    bando: estado.yo.bando,
    partidaId: estado.partida.id, token: estado.yo.token, nombre: estado.yo.nombre, jugadorId: estado.yo.jugador_id,
    aviso,
    alListo: async (escena) => { if (estado.yo !== s) return; estado.escena = escena; await refrescar(); },
    alTocarBloque: verBloque,
    alTerminarDisparo: terminarDisparo,
  });

  estado.poll = setInterval(() => refrescar().catch(() => {}), 10000);
  estado.canal = api.escuchar(estado.partida.id, () => { clearTimeout(estado.t); estado.t = setTimeout(() => refrescar().catch(() => {}), 400); });
}

async function refrescar() {
  const sesion = estado.yo, anterior = estado.partida;
  if (!sesion || !anterior) return;
  const partida = await api.partida(anterior.codigo);
  if (estado.yo !== sesion) return;
  if (partidaCerrada(anterior, partida)) return volverEntrada();
  const [tema, bloques, jugadores, pres, tiros] = await Promise.all([
    api.tema(estado.partida.id), api.bloques(estado.partida.id),
    api.jugadores(estado.partida.id), api.presupuesto(estado.yo.token), api.misDisparos(estado.yo.token),
  ]);
  if (estado.yo !== sesion) return;
  if (partida) { estado.partida = partida; pintarEstado(); }
  estado.bloques = bloques; estado.jugadores = jugadores;
  if (pres) { estado.creditos = pres.restante; estado.presupuesto = pres.presupuesto; }
  $('#hud-tema').textContent = '📜 ' + (tema?.titulo || 'Sin tema');
  const n = (b) => bloques.filter((x) => x.bando === b).length;
  $('#hud-marcador').innerHTML = `<span class="izq">⛺ ${n('izquierda')}</span> · <span class="der">${n('derecha')} 🏢</span>`;
  pintarCreditos();
  if (estado.escena && estado.escena.modo === 'ver') estado.escena.sincronizar(bloques);
  estado.escena?.mostrarJugadores?.(jugadores, estado.yo?.jugador_id);
  estado.disparosRestantes = tiros.restantes; pintarDisparos();
}

function volverEntrada() {
  recordarRonda({ cerrada: true });
  clearInterval(estado.poll); clearTimeout(estado.t);
  if (estado.canal) api.dejarEscuchar(estado.canal);
  estado.canal = null;
  cerrarModal();
  estado.escena?.danos?.desconectar?.();
  estado.juego?.destroy(true);
  Object.assign(estado, { partida: null, yo: null, escena: null, juego: null, jugadores: [], bloques: [], disparo: null, solicitudAtaque: null, reservandoAtaque: false });
  $('#juego').classList.add('oculto');
  $('#lobby').classList.remove('oculto');
  $('#in-nombre').value = '';
  err('Partida terminada. Elige tu nombre y bando cuando se inicie la siguiente.');
  if (!$('#admin').open) $('#in-nombre').focus();
}
// Una pestaña suspendida comprueba el cierre al volver al primer plano.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && estado.yo) refrescar().catch(() => {});
});

function pintarDisparos() {
  if (!estado.yo) return;
  const etiqueta = estado.yo.bando === 'izquierda' ? '🪨 Pedradas' : '🔫 Fuego';
  $('#btn-disparar').textContent = `${etiqueta} (${estado.disparosRestantes ?? 2}/2)`;
  $('#btn-disparar').disabled = estado.partida?.activa === false || estado.disparosRestantes === 0 || !!estado.reservandoAtaque;
}

function pintarCreditos() {
  if (!estado.yo) return;
  const max = estado.presupuesto ?? PRESUPUESTO[estado.yo.bando];
  $('#hud-municion').textContent = `💰 ${Math.max(0, estado.creditos ?? max)}/${max}`;
}

const nombreDe = (id) => estado.jugadores.find((j) => j.id === id)?.nombre || '¿?';

// Selector de catálogo (piezas o munición) con precio
function selector(c, ids, tabla, gratis = false) {
  let sel = ids.find((id) => gratis || tabla[id].coste <= (estado.creditos ?? 0)) || ids[0];
  c.innerHTML = gratis ? `<p class="meta">Disparos gratuitos restantes hoy: ${estado.disparosRestantes ?? 2} de 2.</p><div class="municiones"></div>` : `<p class="meta">Te quedan <b>💰 ${estado.creditos ?? 0}</b> créditos hoy. Mañana se recarga.</p><div class="municiones"></div>`;
  for (const id of ids) {
    const it = tabla[id], button = document.createElement('button');
    button.type = 'button'; button.disabled = !gratis && it.coste > (estado.creditos ?? 0);
    button.textContent = it.emoji;
    for (const text of [it.nombre, gratis ? 'Gratis' : `💰 ${it.coste}`]) { const label = document.createElement('small'); label.textContent = text; button.append(label); }
    button.classList.toggle('sel', id === sel); button.setAttribute('aria-pressed', String(id === sel));
    button.onclick = () => {
      c.querySelectorAll('.municiones button').forEach(other => { other.classList.remove('sel'); other.setAttribute('aria-pressed', 'false'); });
      button.classList.add('sel'); button.setAttribute('aria-pressed', 'true'); sel = id;
    };
    c.querySelector('.municiones').append(button);
  }
  return () => sel;
}

// ---- Construir ----
$('#btn-construir').onclick = () => construir();

async function construir() {
  if (!puedeJugar()) return;
  if (!estado.escena || estado.escena.modo !== 'ver') return;
  const ids = Object.keys(PIEZAS).filter((id) => PIEZAS[id].bando === estado.yo.bando);
  const datos = await modal({
    titulo: estado.yo.bando === 'izquierda' ? '⛺ Ampliar la acampada' : '🏗️ Construir en las torres',
    ok: 'Poner',
    render: (c) => {
      const leer = selector(c, ids, PIEZAS);
      c.insertAdjacentHTML('beforeend', `<input id="m-texto" maxlength="60" placeholder="Pancarta o mensaje (opcional)" />
        <p class="meta">${estado.yo.bando === 'izquierda' ? 'Se coloca solo en el hueco más libre de la plaza.' : 'Las plantas se apilan sobre la torre más baja.'}</p>`);
      return () => {
        const tipo = leer();
        if (PIEZAS[tipo].coste > (estado.creditos ?? 0)) { aviso('No te llega el presupuesto'); return null; }
        return { tipo, texto: c.querySelector('#m-texto').value.trim() };
      };
    },
  });
  if (!datos || !estado.yo) return;
  try {
    const p = PIEZAS[datos.tipo];
    const pos = estado.escena.slotPara(datos.tipo, estado.yo.bando);
    const r = await api.ponerPieza(estado.yo.token, datos.tipo, datos.texto, pos.x, pos.y);
    estado.creditos = r.restante; pintarCreditos();
    aviso(`${p.emoji} ${p.nombre} colocado (-${p.coste} 💰)`);
    refrescar();
  } catch (e) { aviso(e.message, 4000); }
}

// ---- Ver pieza ----
async function verBloque(b) {
  const p = PIEZAS[b.tipo] || { emoji: '❓', nombre: b.tipo };
  await modal({
    titulo: `${p.emoji} ${p.nombre}`,
    ok: 'Cerrar', cancelar: '',
    render: (c) => {
      c.innerHTML = `${b.texto ? `<div class="cita">“${esc(b.texto)}”</div>` : ''}
        <p class="meta">Puesto por ${esc(nombreDe(b.jugador_id))}</p>`;
      return () => true;
    },
  });
}

// ---- Dos ataques manuales gratuitos por día ----
$('#btn-disparar').onclick = async () => {
  if (!puedeJugar()) return;
  const e = estado.escena; if (!e || e.modo !== 'ver' || estado.reservandoAtaque) return;
  const ids = MUNICION[estado.yo.bando];
  if (estado.disparosRestantes === 0) return aviso('Ya has usado tus 2 disparos gratuitos de hoy.');
  const r = await modal({
    titulo: estado.yo.bando === 'izquierda' ? '🪨 ¡A pedradas!' : '🔫 ¡Fuego!',
    ok: estado.yo.bando === 'izquierda' ? '¡Tirad!' : '¡Disparad!',
    render: (c) => {
      const leer = selector(c, ids, MUNICIONES, true);
      c.insertAdjacentHTML('beforeend', `<input id="m-replica" maxlength="140" placeholder="Grito de guerra (opcional)" />`);
      return () => {
        const municion = leer();
        return { municion, replica: c.querySelector('#m-replica').value.trim() };
      };
    },
  });
  if (!r || !estado.yo) return;
  estado.reservandoAtaque = true; pintarDisparos();
  const key = JSON.stringify(r);
  if (estado.solicitudAtaque?.key !== key) estado.solicitudAtaque = { key, id: crypto.randomUUID() };
  try {
    const sesionAtaque = estado.yo;
    const autorizado = await api.iniciarAtaque(estado.yo.token, r.municion, r.replica, estado.solicitudAtaque.id);
    if (estado.yo !== sesionAtaque) return;
    estado.disparosRestantes = autorizado.restantes;
    estado.solicitudAtaque = null;
    if (autorizado.finalizado) { aviso('Este ataque ya se completó.'); return; }
    estado.disparo = { ...r, id: autorizado.id };
    e.atacar(r.municion);
  } catch (error) { aviso(error.message, 5000); await refrescar().catch(() => {}); }
  finally { estado.reservandoAtaque = false; pintarDisparos(); }
};

async function terminarDisparo(est) {
  if (!estado.yo || !estado.disparo) return;
  const { municion, replica, id } = estado.disparo || {};
  try {
    const r = await api.terminarAtaque(estado.yo.token, id, est);
    estado.disparosRestantes = r.restantes; pintarDisparos();
    for (const s of est) if (!s.en_pie) estado.escena.quitar(s.id, true);
    aviso(r.derribados ? `💥 ¡${r.derribados} derribado(s)!` : 'Ni rozarlo. El otro bando se ríe.', 3500);
    if (r.derribados) compartirTexto(`${estado.yo.nombre} ha derribado ${r.derribados} cosa(s) del otro bando a base de ${MUNICIONES[municion]?.emoji || municion}${replica ? ` — “${replica}”` : ''} 💥`);
  } catch (e) { aviso(e.message, 4000); }
  refrescar();
}

// ---- Compartir ----
function compartirTexto(texto) {
  const url = location.href.split('?')[0];
  const msg = `${texto}\n${url}`;
  if (navigator.share) navigator.share({ title: 'Polarizador de Sociedades', text: msg }).catch(() => {});
  else navigator.clipboard?.writeText(msg).then(() => aviso('Copiado: pégalo en el grupo'));
}
$('#btn-compartir').onclick = () => compartirTexto(`⛺🆚🏢 ¿Acampada en Sol o currar en las torres? Elige bando en el Polarizador de Sociedades`);

// ---- Voces ----
const pintaVoz = () => ($('#btn-voz').textContent = voces.activado ? '🔊' : '🔇');
$('#btn-voz').onclick = () => { voces.alternar(); pintaVoz(); };
pintaVoz();

iniciarTutorialInsultos();
iniciarVozEntrada();
