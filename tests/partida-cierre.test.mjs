import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {partidaCerrada,puedeReanudar} from '../src/partida.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('Detecta cierre, eliminación y reinicio entre consultas, conservando una partida vigente',()=>{
 const p={id:'p',activa:true,iniciada_at:'uno'};
 assert.equal(partidaCerrada(p,{...p}),false);
 assert.equal(partidaCerrada({id:'p',codigo:'general',nombre:'España'},p),false);
 assert.equal(partidaCerrada(p,{...p,activa:false}),true);
 assert.equal(partidaCerrada(p,null),true);
 assert.equal(partidaCerrada(p,{...p,iniciada_at:'dos'}),true);
});
async function cliente(){
 const dom=new JSDOM(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'http://localhost'}),d=dom.window.document;
 d.fonts={load:async()=>{}};
 let partida={id:'p',codigo:'general',activa:true,iniciada_at:'uno'},cambio,escuchar,destruido=0,dejado=0,cancelado=0;
 const timers=new Set();
 const api={quienSoy:async()=>null,entrar:async(b,n)=>({partida:{id:partida.id,codigo:partida.codigo,nombre:'España'},token:'t',bando:b,nombre:n,jugador_id:'j'}),renombrar:async()=>{},partida:async()=>({...partida}),jugadores:async()=>[],bloques:async()=>[],tema:async()=>null,presupuesto:async()=>({restante:100,presupuesto:100}),misDisparos:async()=>({restantes:2}),escuchar:(id,fn)=>{escuchar=fn;return 'canal';},dejarEscuchar:()=>dejado++};
 const context=vm.createContext({document:d,window:dom.window,localStorage:dom.window.localStorage,setInterval:fn=>{timers.add(fn);return fn;},clearInterval:fn=>timers.delete(fn),setTimeout,clearTimeout,crypto:globalThis.crypto,console});
 const mods={'./admin.js':{iniciarAdmin:fn=>cambio=fn},'./api.js':{api},'./imagenes.js':{fotoDe:async()=>null},'./voces.js':{voces:{activado:false}},'./game.js':{crearJuego:opts=>{const scene={modo:'ver',sincronizar(){},mostrarJugadores(){}};queueMicrotask(()=>opts.alListo(scene));return {destroy:()=>destruido++};},MUNICION:{},MUNICIONES:{},PIEZAS:{},PRESUPUESTO:{izquierda:100,derecha:200}},'./ui.js':{$:s=>d.querySelector(s),aviso:()=>{},modal:async()=>null,cerrarModal:()=>cancelado++,esc:s=>s},'./partida.js':{partidaCerrada,puedeReanudar}};
 const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8')+'\nexport {refrescar};',{context});
 await mod.link(spec=>{const ex=mods[spec.split('?')[0]];return new vm.SyntheticModule(Object.keys(ex),function(){for(const[k,v]of Object.entries(ex))this.setExport(k,v);},{context});});await mod.evaluate();
 const $=s=>d.querySelector(s);
 async function entrar(){ $('#in-nombre').value='Lola';$('.opcion').click();await flush();await flush(); }
 return {$,entrar,cambio:()=>cambio({...partida}),cerrar:()=>partida.activa=false,refrescar:()=>mod.namespace.refrescar(),stats:()=>({destruido,dejado,cancelado,timers:timers.size})};
}
test('Dos clientes vuelven a la entrada al cerrar: administrador y jugador remoto',async()=>{
 const a=await cliente(),b=await cliente();
 await a.entrar();await b.entrar();
 assert.equal(a.$('#lobby').classList.contains('oculto'),true);
 a.cerrar();b.cerrar();a.cambio();await b.refrescar();
 for(const c of [a,b]){
  assert.equal(c.$('#lobby').classList.contains('oculto'),false);
  assert.equal(c.$('#juego').classList.contains('oculto'),true);
  assert.equal(c.$('#in-nombre').value,'');
  assert.deepEqual(c.stats(),{destruido:1,dejado:1,cancelado:1,timers:0});
  await c.entrar();assert.equal(c.$('#juego').classList.contains('oculto'),true);
  assert.match(c.$('#lobby-error').textContent,/ha terminado/);
 }
});

test('Recargar reanuda la misma ronda y exige elegir de nuevo tras cerrar o reiniciar',()=>{
 const partida={id:'p',activa:true,iniciada_at:'uno'};
 const ronda={id:'p',jugador_id:'j',iniciada_at:'uno'};
 assert.equal(puedeReanudar(ronda,partida,'j'),true);
 assert.equal(puedeReanudar(null,partida,'j'),true);
 assert.equal(puedeReanudar({cerrada:true},partida,'j'),false);
 assert.equal(puedeReanudar(ronda,{...partida,activa:false},'j'),false);
 assert.equal(puedeReanudar(ronda,{...partida,iniciada_at:'dos'},'j'),false);
 assert.equal(puedeReanudar(ronda,partida,'otro'),false);
});
