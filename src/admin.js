import { adminApi } from './api.js?v=20261012-audio2';
import { $ } from './ui.js?v=20261012-audio2';
import { PIEZAS } from './sprites.js?v=20261012-audio2';

// La contraseña y la sesión solo viven en memoria; al cerrar el panel se borran.
export function iniciarAdmin(alCambiar, posicionPara, prueba = {}) {
  const panel = $('#admin');
  let opener = $('#btn-admin');
  let token = null, partida = null, busy = false, generation = 0, jugadores = [], pending = null, reinicio = null;
  const error = (message = '') => { $('#admin-error').textContent = message; };
  function render() {
    $('#admin-login').classList.toggle('oculto', !!token);
    $('#admin-controls').classList.toggle('oculto', !token);
    if (partida) {
      $('#admin-name').textContent = partida.nombre;
      $('#admin-state').textContent = partida.activa ? '● En curso' : '■ Terminada';
      const date = partida.activa ? partida.iniciada_at : partida.terminada_at;
      $('#admin-date').textContent = date ? `${partida.activa ? 'Iniciada' : 'Terminada'}: ${new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(date))}` : '';
    }
    panel.querySelectorAll('button').forEach(b => { if (b.id !== 'admin-close') b.disabled = busy; });
    $('#admin-start').disabled = busy || !partida || partida.activa;
    $('#admin-end').disabled = busy || !partida || !partida.activa;
    const jugador = jugadores.find(j => j.id === $('#admin-player').value);
    $('#admin-player').disabled = busy || !jugadores.length;
    $('#admin-amount').disabled = $('#admin-piece').disabled = $('#admin-text').disabled = busy || !jugador;
    $('#admin-budget').disabled = busy || !jugador;
    $('#admin-build').disabled = busy || !jugador || !partida?.activa;
    $('#admin-build-help').textContent = partida?.activa ? '' : 'Inicia la partida para poder construir.';
    const yo = prueba.jugador?.();
    $('#admin-my-team').textContent = yo ? `Tu bando actual: ${yo.bando === 'izquierda' ? 'Acampada' : 'Torres'}` : 'Entra primero en la partida para probar un bando.';
    $('#admin-test-left').disabled = busy || !yo || yo.bando === 'izquierda';
    $('#admin-test-right').disabled = busy || !yo || yo.bando === 'derecha';
    panel.setAttribute('aria-busy', String(busy));
  }
  function reset() {
    generation++;
    const old = token;
    token = null; partida = null; busy = false; jugadores = []; pending = null; reinicio = null; pintarJugadores();
    $('#admin-login').reset(); $('#admin-budget-form').reset(); $('#admin-build-form').reset();
    $('#admin-amount').removeAttribute('aria-invalid');
    $('#admin-password').type = 'password';
    $('#admin-password').removeAttribute('aria-invalid');
    $('#admin-show').textContent = 'Mostrar'; $('#admin-show').setAttribute('aria-pressed', 'false');
    $('#admin-reset-confirm').classList.add('oculto');
    $('#admin-confirm').classList.add('oculto');
    $('#admin-feedback').textContent = ''; error(); render();
    if (old) adminApi.salir(old).catch(() => {});
  }
  async function run(action) {
    if (busy) return;
    const current = generation; busy = true; error(); $('#admin-feedback').textContent = 'Conectando…'; render();
    try { await action(current); }
    catch (e) {
      if (current !== generation) return;
      if (/caducada/.test(e.message)) { reset(); $('#admin-password').focus(); }
      error(/Could not find the function|PGRST202/.test(e.message) ? 'Falta activar el panel en Supabase. Consulta la configuración de administrador del proyecto.' : e.message);
      $('#admin-feedback').textContent = '';
    } finally { if (current === generation) { busy = false; render(); } }
  }
  document.querySelectorAll('[data-admin-open]').forEach(button => {
    button.onclick = () => { opener = button; reset(); panel.showModal(); $('#admin-password').focus(); };
  });
  $('#admin-close').onclick = () => panel.close();
  panel.addEventListener('close', () => { reset(); opener.focus(); });
  $('#admin-show').onclick = () => {
    const show = $('#admin-password').type === 'password';
    $('#admin-password').type = show ? 'text' : 'password';
    $('#admin-show').textContent = show ? 'Ocultar' : 'Mostrar';
    $('#admin-show').setAttribute('aria-pressed', String(show));
  };
  $('#admin-login').onsubmit = event => {
    event.preventDefault();
    const password = $('#admin-password').value;
    if (!password) { error('Escribe la contraseña de administrador.'); $('#admin-password').setAttribute('aria-invalid', 'true'); $('#admin-password').focus(); return; }
    $('#admin-password').removeAttribute('aria-invalid');
    run(async current => {
      const received = await adminApi.entrar(password);
      if (current !== generation) { await adminApi.salir(received); return; }
      $('#admin-password').value = '';
      token = received;
      const [partidaNueva, lista] = await Promise.all([adminApi.estado(token), adminApi.jugadores(token)]);
      if (current !== generation) return;
      partida = partidaNueva; jugadores = lista; pintarJugadores();
      render(); $('#admin-feedback').textContent = 'Sesión abierta. Caduca en una hora.';
      $('#admin-refresh').focus();
    });
  };
  $('#admin-refresh').onclick = () => run(async current => {
    const [result, lista] = await Promise.all([adminApi.estado(token), adminApi.jugadores(token)]);
    if (current !== generation) return;
    partida = result; jugadores = lista; pintarJugadores(); $('#admin-feedback').textContent = 'Estado actualizado.';
  });
  const change = activa => run(async current => {
    const result = await adminApi.cambiar(token, activa);
    if (current !== generation) return;
    partida = result; $('#admin-confirm').classList.add('oculto');
    $('#admin-feedback').textContent = activa ? 'Partida iniciada. Ya se puede jugar.' : 'Partida terminada. El tablero se conserva.';
    alCambiar(result); render(); $('#admin-refresh').focus();
  });
  $('#admin-start').onclick = () => change(true);
  $('#admin-end').onclick = () => { $('#admin-confirm').classList.remove('oculto'); $('#admin-cancel').focus(); };
  $('#admin-cancel').onclick = () => { $('#admin-confirm').classList.add('oculto'); $('#admin-end').focus(); };
  $('#admin-confirm-end').onclick = () => change(false);
  $('#admin-reset-shots').onclick = () => { $('#admin-reset-confirm').classList.remove('oculto'); $('#admin-reset-cancel').focus(); };
  $('#admin-reset-cancel').onclick = () => { $('#admin-reset-confirm').classList.add('oculto'); $('#admin-reset-shots').focus(); };
  $('#admin-reset-apply').onclick = () => {
    reinicio ||= crypto.randomUUID();
    run(async current => {
      const result = await adminApi.restablecerDisparos(token, reinicio);
      if (current !== generation) return;
      reinicio = null; $('#admin-reset-confirm').classList.add('oculto');
      $('#admin-feedback').textContent = `Disparos restablecidos: ${result.jugadores} jugador(es) tienen 2 disponibles.`;
      alCambiar(partida); $('#admin-reset-shots').focus();
    });
  };
  const probarBando = bando => {
    const yo = prueba.jugador?.();
    if (!yo) return error('Entra primero en la partida para probar un bando.');
    if (prueba.ocupado?.()) return error('Espera a que termine el ataque antes de cambiar de bando.');
    run(async current => {
      const sesion = await adminApi.bando(token, yo.token, bando);
      if (current !== generation) return;
      await prueba.cambiar(sesion);
      if (current !== generation) return;
      jugadores = await adminApi.jugadores(token);
      if (current !== generation) return;
      pintarJugadores();
      $('#admin-feedback').textContent = `Ahora juegas como ${bando === 'izquierda' ? 'Acampada' : 'Torres'}. Cierra el panel para probar.`;
    });
  };
  $('#admin-test-left').onclick = () => probarBando('izquierda');
  $('#admin-test-right').onclick = () => probarBando('derecha');
  $('#admin-logout').onclick = () => { reset(); $('#admin-password').focus(); };
  function pintarJugadores() {
    const select = $('#admin-player'), selected = select.value;
    select.replaceChildren();
    if (!jugadores.length) { select.add(new Option('Todavía no hay jugadores', '')); }
    for (const jugador of jugadores) select.add(new Option(`${jugador.nombre} · ${jugador.bando === 'izquierda' ? 'Acampada' : 'Torres'} · ${jugador.id.slice(0, 6)}`, jugador.id));
    if (jugadores.some(j => j.id === selected)) select.value = selected;
    pintarJugador();
  }
  function pintarJugador() {
    const jugador = jugadores.find(j => j.id === $('#admin-player').value);
    $('#admin-player-balance').textContent = jugador ? `${jugador.nombre}: ${jugador.restante} de ${jugador.presupuesto} créditos disponibles hoy` : 'Cuando alguien entre al juego, podrás elegirlo aquí.';
    const select = $('#admin-piece'); select.replaceChildren();
    for (const [id, pieza] of Object.entries(PIEZAS)) if (pieza.bando === jugador?.bando) select.add(new Option(`${pieza.emoji} ${pieza.nombre}`, id));
    render();
  }
  const operation = key => {
    if (pending?.key !== key) pending = { key, id: crypto.randomUUID() };
    return pending.id;
  };
  $('#admin-player').onchange = () => { pending = null; pintarJugador(); };
  $('#admin-budget-form').onsubmit = event => {
    event.preventDefault();
    const jugador = jugadores.find(j => j.id === $('#admin-player').value);
    if (!jugador) return error('Elige un jugador.');
    const cantidad = Number($('#admin-amount').value);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100000) {
      error('Escribe un número entero entre 1 y 100000 créditos.'); $('#admin-amount').setAttribute('aria-invalid', 'true'); $('#admin-amount').focus(); return;
    }
    $('#admin-amount').removeAttribute('aria-invalid');
    const id = operation(JSON.stringify(['credito', jugador.id, cantidad]));
    run(async current => {
      const result = await adminApi.presupuesto(token, jugador.id, cantidad, id);
      if (current !== generation) return;
      pending = null; Object.assign(jugador, result); pintarJugador();
      $('#admin-feedback').textContent = `Añadidos ${cantidad} créditos para ${jugador.nombre}. Saldo: ${result.restante}.`;
      alCambiar(partida); $('#admin-amount').focus();
    });
  };
  $('#admin-build-form').onsubmit = event => {
    event.preventDefault();
    const jugador = jugadores.find(j => j.id === $('#admin-player').value), tipo = $('#admin-piece').value, texto = $('#admin-text').value.trim();
    if (!jugador || !PIEZAS[tipo] || PIEZAS[tipo].bando !== jugador.bando) return error('Elige un jugador y una pieza de su bando.');
    if (!partida?.activa) return error('Inicia la partida antes de construir.');
    const id = operation(JSON.stringify(['pieza', jugador.id, tipo, texto]));
    run(async current => {
      const pos = await posicionPara(tipo, jugador.bando, partida.id);
      if (current !== generation) return;
      await adminApi.construir(token, jugador.id, tipo, texto, pos, id);
      if (current !== generation) return;
      pending = null; $('#admin-text').value = '';
      $('#admin-feedback').textContent = `${PIEZAS[tipo].nombre} construido para ${jugador.nombre}, sin gastar sus créditos.`;
      alCambiar(partida); $('#admin-build').focus();
    });
  };
  render();
}
