// Detecta también un cierre y reapertura ocurridos mientras el móvil estaba suspendido.
export function partidaCerrada(anterior, actual) {
  return !actual || actual.activa === false ||
    (anterior.iniciada_at !== actual.iniciada_at && (anterior.iniciada_at != null || actual.iniciada_at != null));
}
