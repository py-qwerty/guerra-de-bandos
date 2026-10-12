import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=20261012-refresh1';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CLAVE = 'gdb_sesiones';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { return {}; } };
export const sesion = {
  get: (codigo) => leer()[codigo],
  set: (codigo, datos) => { try { const s = leer(); s[codigo] = datos; localStorage.setItem(CLAVE, JSON.stringify(s)); } catch {} },
};

async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

export const api = {
  quienSoy: () => rpc('quien_soy', {}),
  entrar: (bando, nombre) => rpc('entrar', { p_bando: bando, p_nombre: nombre || null }),
  misDisparos: token => rpc('mis_disparos', { p_token: token }),
  iniciarAtaque: (token, municion, replica, operacion) => rpc('iniciar_ataque', { p_token: token, p_municion: municion, p_replica: replica || '', p_operacion: operacion }),
  terminarAtaque: (token, ataque, estado) => rpc('terminar_ataque', { p_token: token, p_ataque: ataque, p_estado: estado }),
  presupuesto: (token) => rpc('mi_presupuesto', { p_token: token }),
  ponerPieza: (token, tipo, texto, x, y) => rpc('poner_pieza', { p_token: token, p_tipo: tipo, p_texto: texto || null, p_x: x, p_y: y }),
  renombrar: (token, nombre) => rpc('renombrar', { p_token: token, p_nombre: nombre }),
  crearPartida: (nombre) => rpc('crear_partida', { p_nombre: nombre }),
  unirse: (codigo, nombre, bando) => rpc('unirse', { p_codigo: codigo, p_nombre: nombre, p_bando: bando }),
  ponerBloque: (token, texto, x, y, ancho, alto) =>
    rpc('poner_bloque', { p_token: token, p_texto: texto, p_x: x, p_y: y, p_ancho: ancho, p_alto: alto }),
  darLike: (token, bloque) => rpc('dar_like', { p_token: token, p_bloque: bloque }),
  disparar: (token, municion, replica, estado) =>
    rpc('disparar', { p_token: token, p_municion: municion, p_replica: replica, p_estado: estado }),

  async partida(codigo) {
    const { data, error } = await sb.from('partidas').select('*').eq('codigo', codigo.toLowerCase()).maybeSingle();
    if (error) throw error; return data;
  },
  async tema(partidaId) {
    const { data } = await sb.from('temas').select('*').eq('partida_id', partidaId)
      .order('inicio', { ascending: false }).limit(1).maybeSingle();
    return data;
  },
  async jugadores(partidaId) {
    const { data } = await sb.from('jugadores').select('id,nombre,bando,puntos').eq('partida_id', partidaId);
    return data || [];
  },
  async bloques(partidaId) {
    // solo lo construido en la partida actual (lo de partidas anteriores no cuenta)
    const { data: p } = await sb.from('partidas').select('iniciada_at').eq('id', partidaId).maybeSingle();
    let q = sb.from('bloques').select('*').eq('partida_id', partidaId).eq('en_pie', true);
    if (p?.iniciada_at) q = q.gte('created_at', p.iniciada_at);
    const { data } = await q.order('created_at');
    return data || [];
  },
  async disparosHoy(jugadorId) {
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0);
    const { count } = await sb.from('disparos').select('id', { count: 'exact', head: true })
      .eq('jugador_id', jugadorId).gte('created_at', hoy.toISOString());
    return count || 0;
  },
  dejarEscuchar: canal => sb.removeChannel(canal),
  escuchar(partidaId, alCambiar) {
    return sb.channel('partida-' + partidaId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `id=eq.${partidaId}` }, alCambiar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bloques', filter: `partida_id=eq.${partidaId}` }, alCambiar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'disparos', filter: `partida_id=eq.${partidaId}` }, alCambiar)
      .subscribe();
  },
};

export const adminApi = {
  async entrar(password) {
    const r = await rpc('admin_entrar', { p_password: password });
    if (r?.error) throw new Error(r.error);
    if (!r?.token) throw new Error('No se pudo abrir la sesión.');
    return r.token;
  },
  estado: token => rpc('admin_estado', { p_token: token }),
  cambiar: (token, activa) => rpc('admin_partida', { p_token: token, p_activa: activa }),
  salir: token => rpc('admin_salir', { p_token: token }),
  restablecerDisparos: (token, operacion) => rpc('admin_restablecer_disparos', { p_token: token, p_operacion: operacion }),
  bando: (token, jugadorToken, bando) => rpc('admin_bando', { p_token: token, p_jugador_token: jugadorToken, p_bando: bando }),
  jugadores: token => rpc('admin_jugadores', { p_token: token }),
  presupuesto: (token, jugador, cantidad, operacion) => rpc('admin_presupuesto', { p_token: token, p_jugador: jugador, p_cantidad: cantidad, p_operacion: operacion }),
  construir: (token, jugador, tipo, texto, pos, operacion) => rpc('admin_construir', { p_token: token, p_jugador: jugador, p_tipo: tipo, p_texto: texto, p_x: pos.x, p_y: pos.y, p_operacion: operacion }),
};
