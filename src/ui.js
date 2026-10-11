const $ = (s) => document.querySelector(s);
export { $ };

let avisoT, cancelarModal;
export function cerrarModal() { cancelarModal?.(); }
export function aviso(txt, ms = 2600) {
  const a = $('#aviso'); a.textContent = txt; a.classList.remove('oculto');
  clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.add('oculto'), ms);
}

/** Modal genérico. `render(cuerpo)` pinta el contenido y devuelve una función que lee el valor. */
export function modal({ titulo, render, ok = 'Aceptar', cancelar = 'Cancelar' }) {
  cerrarModal();
  return new Promise((resolve) => {
    $('#modal-titulo').textContent = titulo;
    const cuerpo = $('#modal-cuerpo'); cuerpo.innerHTML = '';
    const leer = render ? render(cuerpo) : () => true;
    const bOk = $('#modal-ok'), bNo = $('#modal-cancelar');
    bOk.textContent = ok; bNo.textContent = cancelar; bNo.classList.toggle('oculto', !cancelar);
    $('#modal').classList.remove('oculto');
    const cerrar = (v) => { $('#modal').classList.add('oculto'); bOk.onclick = bNo.onclick = null; cancelarModal = null; resolve(v); };
    cancelarModal = () => cerrar(null);
    bOk.onclick = () => { const v = leer(); if (v !== undefined && v !== null && v !== '') cerrar(v); };
    bNo.onclick = () => cerrar(null);
  });
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
