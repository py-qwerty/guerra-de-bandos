import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const [url, key] = [...readFileSync(new URL('../src/config.js', import.meta.url), 'utf8').matchAll(/= '([^']+)'/g)].map(m => m[1]);
const request = (path, body) => fetch(url + '/rest/v1/' + path, { method: body ? 'POST' : 'GET', headers: { apikey: key, 'Content-Type': 'application/json' }, ...(body && { body: JSON.stringify(body) }) });
for (const [fn, args] of [ ['admin_restablecer_disparos', {p_token:'invalid-test-token',p_operacion:'00000000-0000-0000-0000-000000000001'}], ['admin_bando', {p_token:'invalid-test-token',p_jugador_token:'00000000-0000-0000-0000-000000000001',p_bando:'derecha'}], ['admin_estado', {p_token:'invalid-test-token'}], ['admin_partida', {p_token:'invalid-test-token',p_activa:false}], ['admin_partida', {p_token:'invalid-test-token',p_activa:true}] ]) {
  test(`${fn} rechaza una sesión inválida (${JSON.stringify(args.p_activa)})`, async () => {
    const response = await request('rpc/' + fn, args);
    const body = await response.json();
    assert.equal(response.ok, false);
    assert.equal(body.code, '28000');
  });
}
test('El cliente público no puede cambiar directamente el estado', async () => {
  const response = await fetch(url+'/rest/v1/partidas?codigo=eq.__prueba_sin_filas__', {method:'PATCH',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({activa:false})});
  assert.equal(response.ok, false);
  assert.equal((await response.json()).code, '42501');
});
