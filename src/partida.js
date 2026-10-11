// Detecta también un cierre y reapertura ocurridos mientras el móvil estaba suspendido.
export function partidaCerrada(anterior, actual) {
  return !actual || actual.activa === false ||
    (anterior.iniciada_at !== undefined && actual.iniciada_at !== undefined && anterior.iniciada_at !== actual.iniciada_at);
}

// Una sesión anterior puede continuar únicamente en la misma ronda activa.
// Sin marca local se admite al jugador existente al actualizar desde versiones antiguas.
export function puedeReanudar(ronda, partida, jugadorId) {
  if (!partida || partida.activa !== true || ronda?.cerrada) return false;
  return !ronda || (ronda.id === partida.id && ronda.jugador_id === jugadorId && ronda.iniciada_at === partida.iniciada_at);
}
