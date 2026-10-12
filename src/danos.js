// Daños persistentes y en directo: vida, piezas rotas y píxeles arrancados se guardan en la tabla
// "danos" y llegan al instante a todos los que tengan el juego abierto. Los ataques se retransmiten
// para que el resto vea volar las piedras y los tiros a la vez.
import { sb } from './api.js?v=20261012-refresh1';

export function conectarDanos(partidaId, token, { alCambio, alAtaque, yo }) {
  // presence: entre los que tienen el juego abierto, uno solo (el "líder") calcula el daño del tiroteo de ambiente
  const canal = sb.channel('danos-' + partidaId, { config: { broadcast: { self: false }, presence: { key: yo || String(Math.random()) } } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'danos', filter: `partida_id=eq.${partidaId}` },
      (p) => p.new && alCambio(p.new))
    .on('broadcast', { event: 'ataque' }, ({ payload }) => alAtaque(payload))
    .subscribe((st) => { if (st === 'SUBSCRIBED') canal.track({ t: Date.now() }).catch(() => {}); });

  let cola = Promise.resolve();
  return {
    desconectar: () => sb.removeChannel(canal),
    vaciar: () => cola,
    esLider() {
      const ids = Object.keys(canal.presenceState() || {});
      if (!ids.length) return true; // aún sin datos de presencia: asumimos que estamos solos
      return [...ids].sort()[0] === yo;
    },
    async cargar() {
      // solo los daños de la partida actual: al iniciar una nueva, el tablero sale entero
      const { data: p } = await sb.from('partidas').select('iniciada_at').eq('id', partidaId).maybeSingle();
      let q = sb.from('danos').select('pieza,vida,roto,agujeros').eq('partida_id', partidaId);
      if (p?.iniciada_at) q = q.gte('updated_at', p.iniciada_at);
      const { data, error } = await q;
      if (error) console.warn('[daños]', error.message);
      return data || [];
    },
    enviar(cambios) {
      if (!cambios.length) return cola;
      cola = cola.catch(() => {}).then(async () => {
        const { error } = await sb.rpc('registrar_danos', { p_token: token, p_cambios: cambios });
        if (error) console.warn('[daños]', error.message);
      });
      return cola;
    },
    anunciarAtaque(payload) {
      canal.send({ type: 'broadcast', event: 'ataque', payload }).catch(() => {});
    },
  };
}
