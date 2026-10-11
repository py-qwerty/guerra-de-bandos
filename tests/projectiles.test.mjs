import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as sprites from '../src/sprites.js';
import * as memes from '../src/memes.js';
const phaser={Scene:class{},Physics:{Matter:{Matter:{Sleeping:{set(){}}}}},Math:{Between:(a,b)=>Math.floor((a+b)/2)}};
const context=vm.createContext({window:{Phaser:phaser},Math,Map,Set,Promise});
const module=new vm.SourceTextModule(fs.readFileSync(new URL('../src/game.js',import.meta.url),'utf8'),{context});
const exports={'./sprites.js':sprites,'./memes.js':memes,'./voces.js':{hablar(){},voces:{}},'./danos.js':{conectarDanos(){}}};
await module.link(spec=>{const e=exports[spec];return new vm.SyntheticModule(Object.keys(e),function(){for(const[k,v]of Object.entries(e))this.setExport(k,v);},{context});});await module.evaluate();
for(const [side,ids]of Object.entries(sprites.MUNICION))for(const id of ids)test(`${side}: ${id} genera un proyectil gratuito con trayectoria válida`,()=>{
 const scene=new module.namespace.Campo();scene.init({bando:side});scene.campistas=[];scene.currantes=[];
 const delays=[],velocities=[];
 scene.time={delayedCall:(ms,fn)=>{assert.equal(Number.isFinite(ms),true);delays.push({ms,fn});}};
 scene.objetivosEnemigos=()=>({construidos:[],decor:[{x:side==='izquierda'?1200:300,y:650}]});
 const go={active:true,setScale(){return this;},setDepth(){return this;},setData(){return this;},setCollidesWith(){return this;},setVelocity(x,y){assert.equal(Number.isFinite(x)&&Number.isFinite(y),true);velocities.push([x,y]);return this;},setAngularVelocity(){return this;},destroy(){this.active=false;}};
 scene.matter={add:{image:(x,y,texture)=>{assert.equal(texture,'m_'+id);return go;}}};
 assert.equal(sprites.MUNICIONES[id].coste,0);assert.equal(scene.proyectiles.size,0);
 assert.equal(typeof scene.setJugadores,'undefined');
 scene.atacar(id);assert.equal(scene.proyectiles.size,0); // solo se lanza después de confirmar el ataque
 delays[0].fn();assert.equal(scene.proyectiles.size,1);assert.equal(velocities.length,1);
 assert.equal(Math.sign(velocities[0][0]),side==='izquierda'?1:-1);
});
test('Los ataques remotos solo representan el ataque, sin causar un segundo daño',()=>{
 const scene=new module.namespace.Campo();scene.init({bando:'izquierda'});
 assert.equal(typeof scene.impactoAmbiente,'undefined');
});

function bomba(scene, x, armed) {
 const data={municion:'bomba',tipo:'PROY',bando:'derecha',armado:armed};
 const pr={active:true,x,y:700,body:{velocity:{x:-8,y:0}},getData:k=>data[k],setData(k,v){data[k]=v;},destroy(){this.active=false;}};
 scene.proyectiles.add(pr);return pr;
}
test('La bomba no detona al tocar el suelo del propio campo',()=>{
 const scene=new module.namespace.Campo();scene.init({bando:'derecha'});const calls=[];
 scene.time={delayedCall:(ms,fn)=>calls.push(fn)};
 const pr=bomba(scene,1200,false);
 const a={gameObject:pr,position:{x:1200,y:700}}, b={position:{x:1200,y:740}};
 scene.choques({pairs:[{bodyA:a,bodyB:b}]});assert.equal(calls.length,0);
 pr.setData('armado',true);scene.choques({pairs:[{bodyA:a,bodyB:b}]});assert.equal(calls.length,0);
 pr.x=400;scene.choques({pairs:[{bodyA:a,bodyB:b}]});assert.equal(calls.length,1);
});
test('La explosión solo daña piezas del rival, aunque una aliada esté en el radio',()=>{
 const scene=new module.namespace.Campo();scene.init({bando:'derecha'});
 const affected=[],pixels=[];
 const piece=(id,bando,x)=>({id,x,y:700,active:true,body:{velocity:{x:0,y:0}},getData:k=>k==='bando'?bando:undefined,setVelocity(){},setAngularVelocity(){}});
 scene.decor=[piece('enemy','izquierda',450),piece('friendly','derecha',470),piece('far','izquierda',40)];
 const visual={setScale(){return this;},setTint(){return this;},setDepth(){return this;},setOrigin(){return this;}};
 scene.add={image:()=>visual,text:()=>visual};scene.tweens={add(){}};scene.cameras={main:{shake(){},flash(){}}};
 scene.picar=o=>pixels.push(o.id);scene.danar=o=>affected.push(o.id);
 const pr=bomba(scene,440,true);scene.explotar(pr);
 assert.deepEqual(affected,['enemy']);assert.deepEqual(pixels,['enemy']);assert.equal(pr.active,false);
});
