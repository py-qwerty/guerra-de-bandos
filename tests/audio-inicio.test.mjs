import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const flush=()=>new Promise(r=>setImmediate(r));
async function audio(){
 let decode,starts=0,stops=0;
 class AudioContext {
  state='suspended';destination={};
  async resume(){this.state='running';}
  decodeAudioData(bytes,ok){decode=()=>ok({duration:5});}
  createGain(){return {gain:{},connect(){}};}
  createBufferSource(){return {connect(node){return node;},start(){starts++;},stop(){stops++;this.onended?.();}};}
 }
 const context=vm.createContext({window:{AudioContext,addEventListener(){}},localStorage:{getItem(){return null;}},fetch:async url=>url.includes('voces.json')?{ok:true,json:async()=>({entrada:{Hola:['audio/intro.mp3']}})}:{arrayBuffer:async()=>new ArrayBuffer(1)},setTimeout(){},console,Math,Map,Set});
 const m=new vm.SourceTextModule(fs.readFileSync(new URL('../src/voces.js',import.meta.url),'utf8'),{context});await m.link(()=>{});await m.evaluate();
 return {api:m.namespace,decode:()=>decode(),stats:()=>({starts,stops})};
}
test('El inicio espera a activar el audio, reproduce y permite detener la narración',async()=>{
 const a=await audio();assert.equal(await a.api.desbloquearAudio(),true);
 const play=a.api.hablar('Hola',{canal:'tutorial'});await flush();a.decode();assert.equal(await play,5);assert.equal(a.stats().starts,1);
 a.api.detenerNarracion();assert.equal(a.stats().stops,1);
});
test('Una narración cargada tarde no empieza si ya se salió de la entrada',async()=>{
 const a=await audio();await a.api.desbloquearAudio();let vigente=true;
 const play=a.api.hablar('Hola',{canal:'tutorial',vigente:()=>vigente});await flush();vigente=false;a.decode();await play;assert.equal(a.stats().starts,0);
});
