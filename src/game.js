// Escena principal en pixel art. Todo lo que se ve tiene física y se puede romper.
import {
  P, crearTextura, CAMPISTA, CAMPISTA_MANOS, CURRANTE, CURRANTE_CAFE, TIENDA, OSO, BIDON, BIDON2,
  PALOMA, PALOMA2, NUBE, HONDA, texSegmentoTorre, texCorreos, texReloj, texBloque, MUNICIONES, MUNICION, PIEZAS, PRESUPUESTO,
} from './sprites.js';
import { MEMES_SOL, MEMES_TORRES, AY_SOL, AY_TORRES, GRITO_SOL, GRITO_TORRES, NOMBRES_SOL, NOMBRES_TORRES } from './memes.js';
import { hablar, voces } from './voces.js';
import { conectarDanos } from './danos.js';

const Phaser = window.Phaser;
const M = () => Phaser.Physics.Matter.Matter;

export const W = 1600, H = 800, SUELO = 740;
export const ZONAS = { izquierda: [40, 620], derecha: [980, 1560] };
const HONDA_POS = { izquierda: { x: 690, y: 680 }, derecha: { x: 910, y: 680 } };
export { MUNICIONES, MUNICION, PIEZAS, PRESUPUESTO };

export const MATERIALES = {
  carton:   { densidad: 0.0006, vida: 10, nombre: 'Cartón' },
  madera:   { densidad: 0.0012, vida: 18, nombre: 'Madera' },
  ladrillo: { densidad: 0.0022, vida: 28, nombre: 'Ladrillo' },
  piedra:   { densidad: 0.0035, vida: 40, nombre: 'Piedra' },
  acero:    { densidad: 0.0060, vida: 60, nombre: 'Acero' },
};

// Categorías de colisión
const CAT = { SUELO: 1, BLOQUE: 2, FONDO: 4, ESTRUCTURA: 8, PROY: 16, DEB: 32 };
const MASK = {
  BLOQUE: 1 | 2 | 4 | 8 | 16 | 32,
  FONDO: 1 | 2 | 16,
  ESTRUCTURA: 1 | 2 | 8 | 16 | 32,
  PROY: 1 | 2 | 4 | 8,
  DEB: 1 | 2 | 8,
};
const filtro = (c) => ({ category: CAT[c], mask: MASK[c] });

// Ajustes de dureza: subir RESISTENCIA o UMBRAL_GOLPE hace que todo aguante más
const RESISTENCIA = 3;      // multiplica la vida de todo
const UMBRAL_GOLPE = 6;     // velocidad mínima de choque que hace daño
const DANO_GOLPE = 1.5;     // daño por cada punto de velocidad por encima del umbral
const DISTANCIA_DERRIBO = 150; // px que debe desplazarse algo para contar como derribado

export const FUENTE = '"Press Start 2P", monospace';

const PANCARTAS = ['VIVIENDA DIGNA', 'NO NOS REPRESENTAN', '40M2=1400€', 'DEMOCRACIA REAL YA', 'SIN MIEDO', 'TOMA LA PLAZA'];

// generador pseudoaleatorio con semilla: el decorado sale igual en todos los móviles
function rng(semilla) {
  let a = semilla;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const elegir = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];

export class Campo extends Phaser.Scene {
  constructor() { super('campo'); }

  init(ctx) {
    this.ctx = ctx; this.cuerpos = new Map(); this.decor = []; this.modo = 'ver';
    this.proyectiles = new Set(); this.rotos = new Set(); this.rastro = 0; this.nClon = 0;
    this.porId = new Map(); this.pendientes = new Map(); this.danosGuardados = new Map();
  }

  create() {
    this.matter.world.setBounds(-400, -2000, W + 800, SUELO + 2000, 64, true, true, false, true);
    this.texturas();
    this.fondo();
    this.plazaDelSol();
    this.torres();
    this.animacionesAmbiente();
    this.iniciarDanos();

    this.input.on('pointerdown', (p) => this.pulsar(p));
    this.matter.world.on('collisionstart', (ev) => this.choques(ev));
    this.ctx.alListo?.(this);
  }

  // ================= TEXTURAS =================
  texturas() {
    const camisetas = ['g', 'P', 'p', 'o', 'b', 'r'];
    const pelos = ['h', 'H', 'k', 'o', 'p'];
    camisetas.forEach((c, i) => {
      crearTextura(this, 'camp' + i, CAMPISTA, { X: c, h: pelos[i % pelos.length], s: i % 3 === 2 ? 'S' : 's' });
      crearTextura(this, 'campM' + i, CAMPISTA_MANOS, { X: c, h: pelos[i % pelos.length], s: i % 3 === 2 ? 'S' : 's' });
    });
    ['A', 'd', 'B', 'k'].forEach((c, i) => {
      crearTextura(this, 'curr' + i, CURRANTE, { X: c, h: i === 3 ? 'H' : 'h', s: i === 2 ? 'S' : 's' });
      crearTextura(this, 'currC' + i, CURRANTE_CAFE, { X: c, h: i === 3 ? 'H' : 'h', s: i === 2 ? 'S' : 's' });
    });
    [['g', 'G'], ['o', 'F'], ['p', 'B'], ['P', 'R'], ['y', 'Y'], ['b', 'B'], ['r', 'R']].forEach(([X, x], i) =>
      crearTextura(this, 'tienda' + i, TIENDA, { X, x }));
    crearTextura(this, 'oso', OSO);
    crearTextura(this, 'bidon0', BIDON); crearTextura(this, 'bidon1', BIDON2);
    crearTextura(this, 'paloma0', PALOMA); crearTextura(this, 'paloma1', PALOMA2);
    crearTextura(this, 'nube', NUBE);
    crearTextura(this, 'honda', HONDA);
    crearTextura(this, 'pixel', ['w']);
    texCorreos(this, 'correos'); texReloj(this);
    texSegmentoTorre(this, 'torreA', 'd', 'y'); texSegmentoTorre(this, 'torreB', 'A', 'y');
    texSegmentoTorre(this, 'torreC', 'B', 'f'); texSegmentoTorre(this, 'torreD', 'C', 'y');
    crearTextura(this, 'grua', ['yk', 'ky', 'yk', 'ky', 'yk', 'ky', 'yk', 'ky']);
    crearTextura(this, 'brazo', ['ykykykykykykykykykykykyk', 'kykykykykykykykykykykyky']);
    for (const [id, m] of Object.entries(MUNICIONES)) crearTextura(this, 'm_' + id, m.filas);
  }

  // ================= FONDO (no físico) =================
  fondo() {
    const g = this.add.graphics().setDepth(-10);
    const bandas = [0x5d8fd8, 0x6f9fe0, 0x86b1e8, 0xa1c3ee, 0xbfd6f2, 0xf2d6a8, 0xf7c48a];
    const alto = SUELO / bandas.length;
    bandas.forEach((c, i) => { g.fillStyle(c); g.fillRect(0, i * alto, W, alto + 1); });
    // sol pixelado
    g.fillStyle(0xffe066); g.fillRect(760, 80, 80, 80); g.fillRect(744, 96, 112, 48); g.fillRect(776, 64, 48, 112);
    // suelo a cuadros
    for (let x = 0; x < W; x += 16) for (let y = SUELO; y < H; y += 16) {
      g.fillStyle(((x + y) / 16) % 2 ? 0xc9a66b : 0xb8945a); g.fillRect(x, y, 16, 16);
    }
    g.fillStyle(0x7a5a2c); g.fillRect(0, SUELO, W, 4);
    // meseta
    g.fillStyle(0xd9b56b);
    for (let i = 0; i < 10; i++) g.fillRect(650 + i * 16, SUELO - i * 8, 300 - i * 32, 8);
    this.add.text(800, SUELO - 30, 'LA MESETA', { fontFamily: FUENTE, fontSize: '10px', color: '#6b4d1a' }).setOrigin(0.5).setDepth(-9);
    this.add.text(260, 780, 'PUERTA DEL SOL', { fontFamily: FUENTE, fontSize: '14px', color: '#7a0010' }).setOrigin(0.5).setDepth(-9);
    this.add.text(1300, 780, 'LAS TORRES', { fontFamily: FUENTE, fontSize: '14px', color: '#14284b' }).setOrigin(0.5).setDepth(-9);
    // nubes que se mueven
    for (let i = 0; i < 4; i++) {
      const n = this.add.image(i * 450, 60 + (i % 2) * 70, 'nube').setScale(P).setDepth(-8).setAlpha(0.9);
      this.tweens.add({ targets: n, x: n.x + W + 300, duration: 90000 + i * 15000, repeat: -1,
        onRepeat: () => { n.x = -200; } });
    }
  }

  // ================= PIEZAS FÍSICAS =================
  pieza(x, y, tex, { escala = P, tipo = 'ESTRUCTURA', vida = 20, densidad = 0.002, prof = 2, color = 0xaaaaaa, al = null } = {}) {
    const go = this.matter.add.image(x, y, tex, null, {
      density: densidad, friction: 0.9, frictionStatic: 1, restitution: 0.05, collisionFilter: filtro(tipo),
    }).setScale(escala).setDepth(prof);
    go.setData({ vida: vida * RESISTENCIA, tipo, color, alRomper: al, pixelable: !/^(camp|curr|bidon)/.test(tex) });
    M().Sleeping.set(go.body, true);
    this.registrar(go, 'd' + this.decor.length);
    this.decor.push(go);
    return go;
  }

  plazaDelSol() {
    const r = rng(15);
    // Casa de Correos: 2 columnas x 3 pisos + torre del reloj
    for (let piso = 0; piso < 3; piso++) for (let col = 0; col < 2; col++)
      this.pieza(110 + col * 100, SUELO - 30 - piso * 60, 'correos', { vida: 35, color: 0xe8cfa3 });
    this.pieza(110, SUELO - 180 - 30, 'reloj', { vida: 25, color: 0xe8cfa3 });
    const pepe = this.add.text(0, 0, 'TÍO PEPE', { fontFamily: FUENTE, fontSize: '14px', color: '#ffffff', backgroundColor: '#c8102e', padding: { x: 6, y: 6 } });
    const tpGO = this.matter.add.gameObject(pepe, { density: 0.001, collisionFilter: filtro('ESTRUCTURA') }).setPosition(110, SUELO - 262).setDepth(2);
    tpGO.setData({ vida: 15 * RESISTENCIA, tipo: 'ESTRUCTURA', color: 0xc8102e });
    M().Sleeping.set(tpGO.body, true); this.registrar(tpGO, 'd' + this.decor.length); this.decor.push(tpGO);

    // Tiendas de campaña: muchas, en dos filas (una encima del tejado)
    const xsTiendas = [290, 352, 414, 476, 538, 600, 330, 450, 570];
    xsTiendas.forEach((x, i) => {
      const fila2 = i >= 6;
      this.pieza(x, fila2 ? SUELO - 20 : SUELO - 20, 'tienda' + (i % 7), {
        tipo: 'FONDO', vida: 12, densidad: 0.0008, prof: fila2 ? 3 : 4, color: 0x3fae5a, escala: P,
      }).setAlpha(fila2 ? 0.95 : 1);
    });
    // una tienda en el tejado de Correos, por supuesto
    this.pieza(215, SUELO - 200, 'tienda1', { tipo: 'ESTRUCTURA', vida: 10, densidad: 0.0008, color: 0xff7f27 });

    // Oso y madroño
    this.pieza(640, SUELO - 28, 'oso', { tipo: 'FONDO', vida: 30, densidad: 0.004, prof: 4, color: 0x8b5a2b });

    // Bidón con hoguera
    this.hoguera = this.pieza(505, SUELO - 16, 'bidon0', { tipo: 'FONDO', vida: 15, prof: 5, color: 0x4b4b4b });
    this.time.addEvent({ delay: 160, loop: true, callback: () => {
      if (this.hoguera?.active) this.hoguera.setTexture(this.hoguera.texture.key === 'bidon0' ? 'bidon1' : 'bidon0');
    } });

    // Acampados
    this.campistas = [];
    const xsC = [270, 320, 375, 430, 470, 540, 585, 620];
    xsC.forEach((x, i) => {
      const t = i % 6;
      const c = this.pieza(x, SUELO - 26, 'camp' + t, { tipo: 'FONDO', vida: 8, densidad: 0.001, prof: 6, color: 0xf1c27d });
      c.setData({ persona: true, bando: 'izquierda', tex: 'camp' + t, texM: 'campM' + t });
      if (i % 3 === 0) this.pancarta(c, PANCARTAS[i % PANCARTAS.length]);
      if (NOMBRES_SOL[i]) this.etiqueta(c, NOMBRES_SOL[i], '#ffcdd2');
      this.campistas.push(c);
    });
    // guitarrista
    this.guitarra = this.campistas[4];
  }

  etiqueta(persona, nombre, color) {
    const t = this.add.text(0, 0, nombre.toUpperCase(), { fontFamily: FUENTE, fontSize: '7px', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 1).setDepth(8);
    persona.setData('etiqueta', t);
  }

  pancarta(persona, texto) {
    const t = this.add.text(0, 0, texto, { fontFamily: FUENTE, fontSize: '8px', color: '#111', backgroundColor: '#fff59d', padding: { x: 3, y: 3 } })
      .setOrigin(0.5, 1).setDepth(7);
    persona.setData('pancarta', t);
    this.tweens.add({ targets: t, angle: { from: -8, to: 8 }, duration: 700 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  torres() {
    const defs = [[1050, 5, 'torreA'], [1140, 6, 'torreB'], [1230, 7, 'torreC'], [1320, 6, 'torreD'], [1410, 4, 'torreA']];
    for (const [x, pisos, tex] of defs)
      for (let i = 0; i < pisos; i++) this.pieza(x, SUELO - 32 - i * 64, tex, { vida: 30, densidad: 0.003, color: 0x2f3e52 });
    // la torre más alta es la de INDRA (es un cartel más: también se puede romper)
    const indra = this.add.text(0, 0, ' INDRA ', { fontFamily: FUENTE, fontSize: '16px', color: '#ffffff', backgroundColor: '#1f3a68', padding: { x: 4, y: 6 } });
    const ig = this.matter.add.gameObject(indra, { density: 0.001, collisionFilter: filtro('ESTRUCTURA') }).setPosition(1230, SUELO - 7 * 64 - 16).setDepth(2);
    ig.setData({ vida: 20 * RESISTENCIA, tipo: 'ESTRUCTURA', color: 0x1f3a68 });
    M().Sleeping.set(ig.body, true); this.registrar(ig, 'd' + this.decor.length); this.decor.push(ig);
    // grúa
    for (let i = 0; i < 6; i++) this.pieza(1520, SUELO - 32 - i * 64, 'grua', { escala: P * 2, vida: 18, densidad: 0.002, color: 0xf2c230 });
    this.pieza(1490, SUELO - 32 - 6 * 64 + 8, 'brazo', { escala: P, vida: 18, densidad: 0.001, color: 0xf2c230 });
    const precio = this.add.text(1490, SUELO - 32 - 6 * 64 - 24, '6.000 €/M2', { fontFamily: FUENTE, fontSize: '10px', color: '#111', backgroundColor: '#f2c230', padding: { x: 4, y: 3 } }).setOrigin(0.5).setDepth(3);
    this.tweens.add({ targets: precio, scale: { from: 1, to: 1.12 }, duration: 600, yoyo: true, repeat: -1 });

    this.currantes = [];
    [1000, 1095, 1185, 1275, 1365, 1455, 1545].forEach((x, i) => {
      const t = i % 4;
      const c = this.pieza(x, SUELO - 26, 'curr' + t, { tipo: 'FONDO', vida: 8, densidad: 0.001, prof: 6, color: 0x2f3e52 });
      c.setData({ persona: true, bando: 'derecha', tex: 'curr' + t, texM: 'currC' + t });
      if (NOMBRES_TORRES[i]) this.etiqueta(c, NOMBRES_TORRES[i], '#bbdefb');
      this.currantes.push(c);
    });
    // luces de las oficinas que parpadean
    this.time.addEvent({ delay: 900, loop: true, callback: () => {
      const torres = this.decor.filter((d) => d.active && d.texture.key.startsWith('torre'));
      const t = elegir(torres); if (t) { t.setTint(0xfff3a0); this.time.delayedCall(400, () => t.active && t.clearTint()); }
    } });
  }

  animacionesAmbiente() {
    // asamblea: manos arriba / café
    this.time.addEvent({ delay: 2200, loop: true, callback: () => {
      for (const p of [...this.campistas, ...this.currantes]) {
        if (!p.active || Math.random() > 0.35) continue;
        p.setTexture(p.getData('texM'));
        this.time.delayedCall(900, () => p.active && p.setTexture(p.getData('tex')));
      }
    } });
    // bocadillos con memes
    this.time.addEvent({ delay: 1800, loop: true, callback: () => {
      const izq = Math.random() < 0.55;
      const lista = (izq ? this.campistas : this.currantes).filter((p) => p.active);
      const p = elegir(lista); if (!p) return;
      // si todavía está hablando alguien, esperamos: así cada bocadillo lleva su voz
      if (!voces.libre('ambiente')) return;
      const frase = elegir(izq ? MEMES_SOL : MEMES_TORRES);
      this.bocadillo(p, frase);
      hablar(frase, { volumen: 0.6, bando: izq ? 'izquierda' : 'derecha', canal: 'ambiente' });
    } });
    // notas de guitarra
    this.time.addEvent({ delay: 700, loop: true, callback: () => {
      const g = this.guitarra; if (!g?.active) return;
      const n = this.add.text(g.x + 10, g.y - 30, Math.random() < 0.5 ? '♪' : '♫', { fontFamily: FUENTE, fontSize: '14px', color: '#ffffff' }).setDepth(8);
      this.tweens.add({ targets: n, y: n.y - 60, x: n.x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 1800, onComplete: () => n.destroy() });
    } });
    // palomas
    this.time.addEvent({ delay: 5000, loop: true, callback: () => {
      const y = Phaser.Math.Between(150, 350), dir = Math.random() < 0.5 ? 1 : -1;
      const p = this.add.image(dir > 0 ? -30 : W + 30, y, 'paloma0').setScale(P).setDepth(9).setFlipX(dir < 0);
      const aleteo = this.time.addEvent({ delay: 150, loop: true, callback: () => p.setTexture(p.texture.key === 'paloma0' ? 'paloma1' : 'paloma0') });
      this.tweens.add({ targets: p, x: dir > 0 ? W + 30 : -30, y: y + Phaser.Math.Between(-60, 60), duration: 9000,
        onComplete: () => { aleteo.remove(); p.destroy(); } });
    } });
    // contador de días de acampada
    this.dia = 4217;
    this.cartelDia = this.add.text(400, 470, '', { fontFamily: FUENTE, fontSize: '11px', color: '#fff', backgroundColor: '#7a0010', padding: { x: 6, y: 5 } }).setOrigin(0.5).setDepth(1);
    const pintaDia = () => this.cartelDia.setText(`ACAMPADA SOL · DÍA ${this.dia}`);
    pintaDia();
    this.time.addEvent({ delay: 6000, loop: true, callback: () => { this.dia++; pintaDia(); } });
  }

  // ================= DAÑOS PERSISTENTES Y EN DIRECTO =================
  registrar(go, id) { go.setData({ piezaId: id, vidaMax: go.getData('vida') }); this.porId.set(id, go); }

  iniciarDanos() {
    if (!this.ctx.partidaId || !this.ctx.token) return;
    this.danos = conectarDanos(this.ctx.partidaId, this.ctx.token, {
      alCambio: (d) => this.aplicarDano(d, true),
      alAtaque: (p) => this.ataqueRemoto(p),
      yo: this.ctx.jugadorId,
    });
    this.danos.cargar().then((lista) => lista.forEach((d) => this.aplicarDano(d, false)));
    // los daños propios se envían en tandas, casi al momento
    this.time.addEvent({ delay: 1200, loop: true, callback: () => this.enviarDanos() });
  }

  marcar(go, cambio) {
    const id = go.getData('piezaId'); if (!id || !this.danos) return;
    const p = this.pendientes.get(id) || { id, vida: go.getData('vida'), roto: false, agujeros: [] };
    if (cambio.vida != null) p.vida = Math.min(p.vida ?? cambio.vida, cambio.vida);
    if (cambio.roto) p.roto = true;
    if (cambio.agujeros) p.agujeros.push(...cambio.agujeros);
    this.pendientes.set(id, p);
  }

  enviarDanos() {
    if (!this.pendientes.size || !this.danos) return;
    const lote = [...this.pendientes.values()].map((p) => ({ ...p, vida: Math.max(0, p.vida ?? 0) }));
    this.pendientes.clear();
    // un bloque construido "roto" se gestiona al cerrar el ataque (en_pie); aquí solo su vida y agujeros
    this.danos.enviar(lote);
  }

  /** Aplica un daño guardado o recibido en directo (sin volver a enviarlo). */
  aplicarDano(d, enDirecto) {
    this.danosGuardados.set(d.pieza, d);
    const go = this.porId.get(d.pieza);
    if (!go?.active) return;
    if (d.roto && this.cuerpos.has(d.pieza)) { this.quitar(d.pieza, enDirecto); return; }
    if (d.roto) {
      if (enDirecto) this.escombros(go.x, go.y, go.getData('color'), go.getData('persona') ? 6 : 10);
      go.getData('pancarta')?.destroy(); go.getData('etiqueta')?.destroy();
      go.destroy();
      return;
    }
    const vida = go.getData('vida');
    if (vida == null || d.vida < vida) {
      go.setData('vida', d.vida);
      if (enDirecto) { go.setTint(0xff9999); this.time.delayedCall(150, () => { if (!go.active) return; const t = go.getData('tinte'); t ? go.setTint(t) : go.clearTint(); }); }
    }
    if (d.agujeros?.length) this.aplicarAgujeros(go, d.agujeros, enDirecto);
  }

  aplicarAgujeros(go, agujeros, enDirecto) {
    if (!go.getData('pixelable')) return;
    let clave = go.texture.key;
    if (!go.getData('clon')) {
      const src = this.textures.get(clave).getSourceImage();
      const nueva = clave + '_u' + (this.nClon++);
      const t = this.textures.createCanvas(nueva, src.width, src.height);
      t.getContext().drawImage(src, 0, 0); t.refresh();
      go.setTexture(nueva); go.setData('clon', true); clave = nueva;
    }
    const tex = this.textures.get(clave), ctx = tex.getContext();
    const hechos = go.getData('agujerosHechos') || new Set();
    let nuevos = 0;
    for (const [x, y] of agujeros) {
      const k = x + ',' + y; if (hechos.has(k)) continue;
      hechos.add(k); ctx.clearRect(x, y, 1, 1); nuevos++;
    }
    go.setData('agujerosHechos', hechos);
    if (nuevos) { tex.refresh(); if (enDirecto) this.chispa(go.x, go.y, false); }
  }

  /** Otro jugador está atacando: vemos sus proyectiles volar (el daño llega aparte, en directo). */
  ataqueRemoto(p) {
    const mu = MUNICIONES[p.municion]; if (!mu) return;
    const n = Math.min(mu.cantidad, 9);
    for (let i = 0; i < n; i++) this.time.delayedCall(i * (mu.bala ? 120 : 350), () =>
      this.lanzarAmbiente({ bando: p.bando, nombre: i === 0 ? p.nombre : '' }, p.municion));
    if (p.nombre) this.ctx.aviso?.(`${p.bando === 'izquierda' ? '🪨' : '🔫'} ¡${p.nombre} está atacando!`);
  }

  lanzarAmbiente(j, municion = null) {
    const izq = j.bando === 'izquierda';
    const tiradores = (izq ? this.campistas : this.currantes).filter((p) => p.active);
    const t = elegir(tiradores);
    const ox = t ? t.x : (izq ? 560 : 1040), oy = t ? t.y - 28 : SUELO - 60;
    const tx = izq ? Phaser.Math.Between(1020, 1480) : Phaser.Math.Between(120, 600);
    const ty = Phaser.Math.Between(SUELO - 360, SUELO - 40);
    if (t) { t.setTexture(t.getData('texM')); this.time.delayedCall(350, () => t.active && t.setTexture(t.getData('tex'))); }
    const tex = 'm_' + (municion || (izq ? 'piedra' : 'pelota'));
    const img = this.add.image(ox, oy, tex).setScale(municion === 'bomba' ? P : izq ? P * 1.3 : P * 1.6).setDepth(13);
    const nombre = this.add.text(ox, oy - 18, (j.nombre || '').toUpperCase(), {
      fontFamily: FUENTE, fontSize: '7px', color: izq ? '#ffcdd2' : '#bbdefb', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(13);
    const arco = izq ? Phaser.Math.Between(140, 260) : Phaser.Math.Between(20, 60); // piedra en parábola, bala casi recta
    if (!izq) {
      img.setFlipX(true);
      const f = this.add.image(ox - 16, oy, 'pixel').setScale(P * 4).setTint(0xffe066).setDepth(12);
      this.tweens.add({ targets: f, alpha: 0, scale: P * 7, duration: 120, onComplete: () => f.destroy() });
    }
    const dur = izq ? 3200 : 2400; // lento, para que se vea
    this.tweens.addCounter({
      from: 0, to: 1, duration: dur, ease: 'Linear',
      onUpdate: (tw) => {
        const k = tw.getValue();
        const x = Phaser.Math.Linear(ox, tx, k), y = Phaser.Math.Linear(oy, ty, k) - arco * 4 * k * (1 - k);
        img.setPosition(x, y); nombre.setPosition(x, y - 18);
        if (izq) img.rotation += 0.08;
        if (Math.random() < 0.25) {
          const r = this.add.image(x, y, 'pixel').setScale(P).setTint(izq ? 0xdddddd : 0xffe066).setAlpha(0.6).setDepth(12);
          this.tweens.add({ targets: r, alpha: 0, duration: 400, onComplete: () => r.destroy() });
        }
      },
      onComplete: () => {
        if (municion === 'bomba') { this.cameras.main.shake(250, 0.008); const b = this.add.text(img.x, img.y - 20, '¡BOOM!', { fontFamily: FUENTE, fontSize: '20px', color: '#ffeb3b', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(20); this.tweens.add({ targets: b, y: b.y - 60, alpha: 0, duration: 1000, onComplete: () => b.destroy() }); }
        this.chispa(img.x, img.y, !izq);

        img.destroy(); nombre.destroy();
      },
    });
  }

  bocadillo(p, texto, color = '#ffffff') {
    const b = this.add.text(p.x, p.y - 44, texto, {
      fontFamily: FUENTE, fontSize: '9px', color: '#111', backgroundColor: color, padding: { x: 5, y: 4 },
      wordWrap: { width: 190 }, align: 'center',
    }).setOrigin(0.5, 1).setDepth(12);
    b.x = Phaser.Math.Clamp(b.x, b.width / 2 + 4, W - b.width / 2 - 4);
    this.tweens.add({ targets: b, y: b.y - 10, duration: 200, ease: 'Back.out' });
    this.time.delayedCall(2200, () => this.tweens.add({ targets: b, alpha: 0, duration: 300, onComplete: () => b.destroy() }));
  }

  // ================= BLOQUES (argumentos de la base de datos) =================
  sincronizar(bloques) {
    const vivos = new Set(bloques.map((b) => b.id));
    for (const id of [...this.cuerpos.keys()]) if (!vivos.has(id)) this.quitar(id, false);
    for (const b of bloques) {
      const c = this.cuerpos.get(b.id);
      if (!c) this.crearBloque(b);
      else if (c.datos.material !== b.material) { this.quitar(b.id, false); this.crearBloque(b); }
      else c.datos = b;
    }
  }

  // Huecos donde se coloca lo que construye cada bando (sin colisiones absurdas)
  slots(tipo) {
    if (tipo === 'tienda') return { desde: 270, hasta: 640, paso: 30 };
    if (tipo === 'perroflauta') return { desde: 262, hasta: 640, paso: 20 };
    if (tipo === 'currante') return { desde: 990, hasta: 1560, paso: 24 };
    return null;
  }

  columnasTorre() { return [1050, 1140, 1230, 1320, 1410]; }

  // y del techo de una columna de torre (lo más alto que haya en pie en esa x)
  techo(x) {
    let top = SUELO;
    const todo = [...this.decor, ...[...this.cuerpos.values()].map((c) => c.go)];
    for (const o of todo) {
      if (!o.active || Math.abs(o.x - x) > 30 || !o.texture?.key?.startsWith('torre')) continue;
      top = Math.min(top, o.getBounds().top);
    }
    return top;
  }

  // ¿Cuántas piezas iguales hay ya en esta x? -> fila (0 = delante)
  filaEn(tipo, bando, x) {
    let n = 0;
    for (const c of this.cuerpos.values()) if (c.datos.tipo === tipo && c.datos.bando === bando && Math.abs(c.datos.x - x) < 6) n++;
    return n;
  }

  /** Elige dónde va la nueva pieza: el hueco más vacío (o la torre más baja). */
  slotPara(tipo, bando) {
    if (tipo === 'planta') {
      const cols = this.columnasTorre();
      let mejor = cols[0], techoMejor = -1;
      for (const x of cols) { const t = this.techo(x); if (t > techoMejor) { techoMejor = t; mejor = x; } }
      return { x: mejor, y: Math.round(techoMejor - 32) };
    }
    const s = this.slots(tipo);
    let mejor = s.desde, menos = Infinity;
    const xs = []; for (let x = s.desde; x <= s.hasta; x += s.paso) xs.push(x);
    // empate: al azar, para que la acampada crezca de forma natural
    xs.sort(() => Math.random() - 0.5);
    for (const x of xs) { const n = this.filaEn(tipo, bando, x); if (n < menos) { menos = n; mejor = x; } }
    return { x: mejor, y: SUELO - 26 };
  }

  crearBloque(b) {
    const h = [...b.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const defs = {
      tienda:      { tex: 'tienda' + (h % 7), vida: 12, dens: 0.0008, color: 0x3fae5a, alto: 40 },
      perroflauta: { tex: 'camp' + (h % 6), texM: 'campM' + (h % 6), vida: 8, dens: 0.001, color: 0xf1c27d, persona: true, alto: 52 },
      planta:      { tex: 'torre' + 'ABCD'[h % 4], vida: 30, dens: 0.003, color: 0x2f3e52, alto: 64 },
      currante:    { tex: 'curr' + (h % 4), texM: 'currC' + (h % 4), vida: 8, dens: 0.001, color: 0x2f3e52, persona: true, alto: 52 },
    };
    const d = defs[b.tipo] || defs.tienda;
    let x = b.x, y = b.y, escala = P, fila = 0, prof = d.persona ? 6 : 4;
    if (b.tipo === 'planta') {
      // se apila encima de la torre de su columna
      x = this.columnasTorre().reduce((a, c) => (Math.abs(c - b.x) < Math.abs(a - b.x) ? c : a));
      y = this.techo(x) - 32;
    } else {
      // en el suelo; si el hueco está ocupado, va detrás, un poco más pequeña y oscura (perspectiva)
      fila = this.filaEn(b.tipo, b.bando, b.x);
      escala = P * Math.max(0.55, 1 - fila * 0.12);
      y = SUELO - (d.alto / P) * escala / 2;
      x = b.x + (fila % 2 ? 10 : 0);
      prof = (d.persona ? 6 : 4) - fila * 0.1;
    }
    const go = this.matter.add.image(x, y, d.tex, null, {
      density: d.dens, friction: 0.9, frictionStatic: 1, restitution: 0.05,
      collisionFilter: filtro(b.tipo === 'planta' ? 'ESTRUCTURA' : 'FONDO'),
    }).setScale(escala).setDepth(prof);
    if (b.tipo === 'planta') go.setRotation(0);
    const tinte = fila > 0 ? Phaser.Display.Color.GetColor(255 - fila * 25, 255 - fila * 25, 255 - fila * 20) : 0;
    if (tinte) go.setTint(tinte);
    go.setData({ vida: d.vida * RESISTENCIA, tipo: 'BLOQUE', bloqueId: b.id, color: d.color, persona: !!d.persona, bando: b.bando, tex: d.tex, texM: d.texM || d.tex, tinte, pixelable: !d.persona });
    let label = null;
    if (b.texto) {
      const izq = b.bando === 'izquierda';
      label = this.add.text(x, y, b.texto, {
        fontFamily: FUENTE, fontSize: '7px', color: '#111', backgroundColor: izq ? '#fff59d' : '#bbdefb',
        padding: { x: 3, y: 3 }, wordWrap: { width: 120 }, align: 'center',
      }).setOrigin(0.5, 1).setDepth(prof + 1);
      if (d.persona) this.tweens.add({ targets: label, angle: { from: -6, to: 6 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    if (d.persona) (b.bando === 'izquierda' ? this.campistas : this.currantes).push(go);
    M().Sleeping.set(go.body, true);
    const alto = (d.alto / P) * escala / 2;
    this.cuerpos.set(b.id, { go, label, datos: b, alto: alto + 4, origen: { x, y, a: 0 } });
    this.registrar(go, b.id);
    const guardado = this.danosGuardados.get(b.id); if (guardado) this.aplicarDano(guardado, false);
  }

  quitar(id, efecto = true) {
    const c = this.cuerpos.get(id); if (!c) return;
    if (efecto) { this.escombros(c.go.x, c.go.y, c.go.getData('color'), 10); this.refutado(c.go.x, c.go.y); }
    c.go.destroy(); c.label?.destroy(); this.cuerpos.delete(id);
  }

  refutado(x, y) {
    const t = this.add.text(x, y - 20, '¡DERRIBADO!', { fontFamily: FUENTE, fontSize: '16px', color: '#ffeb3b', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 90, scale: 1.4, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
  }

  bloqueEn(x, y) {
    for (const c of this.cuerpos.values()) if (c.go.getBounds().contains(x, y)) return c;
    return null;
  }

  // ================= DESTRUCCIÓN =================
  enCampoRival(x, bando) {
    return bando === 'izquierda' ? x > W / 2 : x < W / 2;
  }

  esObjetivoRival(go, bando) {
    const lado = go?.getData?.('bando');
    if (lado === 'izquierda' || lado === 'derecha') return lado !== bando;
    const [min, max] = ZONAS[bando === 'izquierda' ? 'derecha' : 'izquierda'];
    return !!go && go.x >= min - 40 && go.x <= max + 40;
  }

  choques(ev) {
    for (const par of ev.pairs) {
      const a = par.bodyA.parent || par.bodyA, b = par.bodyB.parent || par.bodyB;
      const ga = a.gameObject, gb = b.gameObject;
      const esPr = (g) => g?.active && this.proyectiles.has(g);
      const pr = esPr(ga) ? ga : esPr(gb) ? gb : null;
      const otro = pr === ga ? gb : ga;
      const punto = par.collision?.supports?.[0] || { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };
      if (pr) {
        const mu = MUNICIONES[pr.getData('municion')];
        const bando = pr.getData('bando') || this.ctx.bando;
        if (!pr.getData('armado') || !this.enCampoRival(pr.x, bando)) continue;
        if (otro?.getData?.('vida') != null && !this.esObjetivoRival(otro, bando)) continue;
        if (mu.explota) { if (!pr.getData('explotado')) { pr.setData('explotado', true); this.time.delayedCall(0, () => this.explotar(pr)); } continue; }
        if (pr.getData('usado') >= 2) continue; // cada proyectil solo hace daño en sus 2 primeros impactos
        const vel = Math.hypot(pr.body.velocity.x - (otro?.body?.velocity.x || 0), pr.body.velocity.y - (otro?.body?.velocity.y || 0));
        if (otro?.getData?.('vida') != null && vel > 3) {
          pr.setData('usado', (pr.getData('usado') || 0) + 1);
          this.picar(otro, punto.x, punto.y, mu.picado);
          this.danar(otro, Math.max(4, (vel - 3) * DANO_GOLPE) * mu.dano);
          this.chispa(punto.x, punto.y, mu.bala);
          if (mu.bala) pr.destroy(), this.proyectiles.delete(pr);
        }
        continue;
      }
      const vel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (vel < UMBRAL_GOLPE) continue;
      const golpe = (vel - UMBRAL_GOLPE) * DANO_GOLPE;
      const desdeDeb = (o) => o.gameObject?.getData?.('tipo') === 'DEB';
      this.danar(ga, desdeDeb(b) ? golpe * 0.05 : golpe);
      this.danar(gb, desdeDeb(a) ? golpe * 0.05 : golpe);
    }
  }

  chispa(x, y, bala) {
    for (let i = 0; i < (bala ? 3 : 5); i++) {
      const c = this.add.image(x, y, 'pixel').setScale(P).setTint(bala ? 0xffe066 : 0xdddddd).setDepth(14);
      this.tweens.add({ targets: c, x: x + Phaser.Math.Between(-18, 18), y: y + Phaser.Math.Between(-18, 6), alpha: 0, duration: 300, onComplete: () => c.destroy() });
    }
  }

  // Arranca píxeles reales del sprite en el punto del impacto
  picar(go, wx, wy, radio) {
    if (!go?.active || !go.getData('pixelable')) return;
    let clave = go.texture.key;
    if (!go.getData('clon')) {
      const src = this.textures.get(clave).getSourceImage();
      const nueva = clave + '_u' + (this.nClon++);
      const t = this.textures.createCanvas(nueva, src.width, src.height);
      t.getContext().drawImage(src, 0, 0); t.refresh();
      go.setTexture(nueva); go.setData('clon', true); clave = nueva;
    }
    const tex = this.textures.get(clave), ctx = tex.getContext();
    const w = tex.getSourceImage().width, h = tex.getSourceImage().height;
    const l = go.getLocalPoint(wx, wy);
    // acercar el punto al sprite (el contacto suele estar en el borde)
    let cx = Phaser.Math.Clamp(Math.floor(l.x), 0, w - 1), cy = Phaser.Math.Clamp(Math.floor(l.y), 0, h - 1);
    const datos = ctx.getImageData(0, 0, w, h).data;
    let quitados = 0; const agujeros = [];
    for (let dy = -radio; dy <= radio; dy++) for (let dx = -radio; dx <= radio; dx++) {
      if (dx * dx + dy * dy > radio * radio + 0.5) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const k = (y * w + x) * 4; if (datos[k + 3] === 0) continue;
      const color = (datos[k] << 16) | (datos[k + 1] << 8) | datos[k + 2];
      ctx.clearRect(x, y, 1, 1); quitados++; agujeros.push([x, y]);
      if (quitados <= 4) {
        const d = this.add.image(wx, wy, 'pixel').setScale(go.scaleX).setTint(color).setDepth(9);
        this.tweens.add({ targets: d, x: wx + Phaser.Math.Between(-30, 30), y: Math.min(SUELO - 2, wy + Phaser.Math.Between(10, 80)), angle: 180, duration: 600, ease: 'Quad.in',
          onComplete: () => this.tweens.add({ targets: d, alpha: 0, delay: 800, duration: 400, onComplete: () => d.destroy() }) });
      }
    }
    if (quitados) { tex.refresh(); this.marcar(go, { agujeros }); }
  }

  danar(go, d) {
    if (!go?.active || !go.getData || go.getData('tipo') === 'DEB' || go.getData('tipo') === 'PROY') return;
    const vida = go.getData('vida'); if (vida == null || d <= 0) return;
    if (go.getData('persona') && !go.getData('gritado')) {
      go.setData('gritado', true);
      const ay = elegir(go.getData('bando') === 'izquierda' ? AY_SOL : AY_TORRES);
      this.bocadillo(go, ay, '#ffcdd2'); hablar(ay, { volumen: 0.9, bando: go.getData('bando') });
      go.getData('pancarta')?.destroy(); go.setData('pancarta', null);
    }
    const nueva = vida - d; go.setData('vida', nueva);
    this.marcar(go, { vida: Math.max(0, nueva), roto: nueva <= 0 });
    if (nueva > 0) { go.setTint(0xff9999); this.time.delayedCall(120, () => { if (!go.active) return; const t = go.getData('tinte'); t ? go.setTint(t) : go.clearTint(); }); return; }
    // ¡roto!
    const id = go.getData('bloqueId');
    if (id) { this.rotos.add(id); const c = this.cuerpos.get(id);
      if (c) { this.escombros(go.x, go.y, go.getData('color'), 12); this.refutado(go.x, go.y); c.label?.destroy(); this.cuerpos.delete(id); } }
    else this.escombros(go.x, go.y, go.getData('color'), go.getData('persona') ? 6 : 10);
    go.getData('pancarta')?.destroy();
    go.getData('etiqueta')?.destroy();
    go.destroy();
    this.cameras.main.shake(80, 0.003);
  }

  explotar(pr) {
    if (!pr?.active) return;
    const bando = pr.getData('bando') || this.ctx.bando;
    if (!pr.getData('armado') || !this.enCampoRival(pr.x, bando)) return;
    const { x, y } = pr; const radio = MUNICIONES[pr.getData('municion')].explota;
    pr.destroy(); this.proyectiles.delete(pr);
    // bola de fuego pixelada
    for (let i = 0; i < 18; i++) {
      const f = this.add.image(x, y, 'pixel').setScale(P * Phaser.Math.Between(3, 7)).setTint(elegir([0xffb000, 0xff4500, 0xffe066, 0x555555])).setDepth(15);
      const ang = Math.random() * Math.PI * 2, dist = Math.random() * radio * 0.7;
      this.tweens.add({ targets: f, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist, alpha: 0, scale: P * 9, duration: 600 + Math.random() * 400, onComplete: () => f.destroy() });
    }
    const t = this.add.text(x, y - 30, '¡BOOM!', { fontFamily: FUENTE, fontSize: '22px', color: '#ffeb3b', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, scale: 1.5, duration: 1200, onComplete: () => t.destroy() });
    this.cameras.main.shake(350, 0.012); this.cameras.main.flash(120, 255, 200, 120);
    const objetivos = [...this.decor, ...[...this.cuerpos.values()].map((c) => c.go)];
    for (const o of objetivos) {
      if (!o.active || !o.body || !this.esObjetivoRival(o, bando)) continue;
      const dx = o.x - x, dy = o.y - y, dist = Math.hypot(dx, dy);
      if (dist > radio) continue;
      const fuerza = 1 - dist / radio;
      M().Sleeping.set(o.body, false);
      o.setVelocity(o.body.velocity.x + (dx / (dist || 1)) * 11 * fuerza, o.body.velocity.y + (dy / (dist || 1)) * 11 * fuerza - 4 * fuerza);
      o.setAngularVelocity((Math.random() - 0.5) * 0.4 * fuerza);
      this.picar(o, x, y, 3);
      this.danar(o, 35 * fuerza * RESISTENCIA * 0.6);
    }
  }

  escombros(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const d = this.matter.add.image(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-15, 15), 'pixel', null, {
        density: 0.001, restitution: 0.4, friction: 0.5, collisionFilter: filtro('DEB'),
      }).setScale(P * Phaser.Math.Between(1, 3)).setTint(Phaser.Display.Color.ValueToColor(color).darken(Phaser.Math.Between(0, 30)).color).setDepth(8);
      d.setData('tipo', 'DEB');
      d.setVelocity(Phaser.Math.FloatBetween(-6, 6), Phaser.Math.FloatBetween(-9, -2));
      d.setAngularVelocity(Phaser.Math.FloatBetween(-0.3, 0.3));
      this.tweens.add({ targets: d, alpha: 0, delay: 1800, duration: 900, onComplete: () => d.destroy() });
    }
    // polvo
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(x, y, 'pixel').setScale(P * 3).setTint(0xdddddd).setAlpha(0.7).setDepth(9);
      this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-50, 50), y: y + Phaser.Math.Between(-50, 10), scale: P * 6, alpha: 0, duration: 700, onComplete: () => p.destroy() });
    }
  }

  // ================= MODOS =================
  setModo(modo) { this.modo = modo; }

  pulsar(p) {
    if (this.modo !== 'ver') return;
    const c = this.bloqueEn(p.worldX, p.worldY);
    if (c) this.ctx.alTocarBloque?.(c.datos);
  }

  objetivosEnemigos() {
    const enemigo = this.ctx.bando === 'izquierda' ? 'derecha' : 'izquierda';
    const [x0, x1] = ZONAS[enemigo];
    const construidos = [...this.cuerpos.values()].filter((c) => c.datos.bando === enemigo && c.go.active).map((c) => c.go);
    const decor = this.decor.filter((d) => d.active && d.x >= x0 - 40 && d.x <= x1 + 40);
    return { construidos, decor };
  }

  /** Ejecuta el ataque que el jugador ha confirmado y el servidor ha autorizado. */
  atacar(id) {
    this.danos?.anunciarAtaque({ bando: this.ctx.bando, municion: id, nombre: this.ctx.nombre });
    const mu = MUNICIONES[id];
    const izq = this.ctx.bando === 'izquierda';
    this.setModo('volando');
    for (const c of this.cuerpos.values()) M().Sleeping.set(c.go.body, false);
    for (const d of this.decor) if (d.active) M().Sleeping.set(d.body, false);

    const tiradores = (izq ? this.campistas : this.currantes).filter((p) => p.active);
    const { construidos, decor } = this.objetivosEnemigos();
    const objetivo = () => (construidos.length && Math.random() < 0.6 ? elegir(construidos) : elegir(decor));
    const grito = izq ? GRITO_SOL : GRITO_TORRES;

    for (let i = 0; i < mu.cantidad; i++) {
      this.time.delayedCall(i * (mu.bala ? 110 : 380), () => {
        const t = elegir(tiradores);
        const ox = t ? t.x : (izq ? 600 : 1000), oy = t ? t.y - 26 : SUELO - 60;
        const obj = objetivo(); if (!obj) return;
        if (t) {
          t.setTexture(t.getData('texM'));
          this.time.delayedCall(350, () => t.active && t.setTexture(t.getData('tex')));
          if (i === 0 || Math.random() < 0.15) { const gr = elegir(grito); this.bocadillo(t, gr, izq ? '#fff59d' : '#bbdefb'); if (i === 0) hablar(gr, { volumen: 1, bando: this.ctx.bando }); }
        }
        this.proyectilHacia(id, ox, oy, obj.x + Phaser.Math.Between(-20, 20), obj.y + Phaser.Math.Between(-20, 10));
      });
    }
    this.time.delayedCall(mu.cantidad * (mu.bala ? 110 : 380) + 4500, () => this.cerrarDisparo());
  }

  proyectilHacia(id, ox, oy, tx, ty) {
    const mu = MUNICIONES[id];
    const g = 0.278; // gravedad por paso de Matter
    const T = mu.vuelo + Phaser.Math.Between(-6, 6);
    const vx = (tx - ox) / T, vy = (ty - oy) / T - 0.5 * g * T;
    const go = this.matter.add.image(ox, oy, 'm_' + id, null, {
      shape: { type: 'circle', radius: mu.radio }, density: mu.densidad, restitution: mu.rebote, frictionAir: 0, collisionFilter: filtro('PROY'),
    }).setScale(mu.bala ? P * 0.75 : P).setDepth(10);
    go.setData({ tipo: 'PROY', municion: id, bando: this.ctx.bando, armado: false });
    go.setCollidesWith(CAT.SUELO); // no choca con lo de su propio bando al salir
    go.setVelocity(vx, vy);
    if (mu.bala) {
      go.setRotation(Math.atan2(vy, vx)); go.setFixedRotation();
      // fogonazo
      const f = this.add.image(ox + Math.sign(vx) * 18, oy, 'pixel').setScale(P * 4).setTint(0xffe066).setDepth(11);
      this.tweens.add({ targets: f, alpha: 0, scale: P * 6, duration: 90, onComplete: () => f.destroy() });
      if (Math.random() < 0.3) {
        const pam = this.add.text(ox, oy - 20, elegir(['PAM!', 'BANG!', 'RATATA']), { fontFamily: FUENTE, fontSize: '9px', color: '#ffe066', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(12);
        this.tweens.add({ targets: pam, y: pam.y - 20, alpha: 0, duration: 500, onComplete: () => pam.destroy() });
      }
    } else go.setAngularVelocity(0.25);
    this.proyectiles.add(go);
    this.time.delayedCall(6000, () => { if (go.active) { go.destroy(); this.proyectiles.delete(go); } });
  }

  update() {
    for (const c of this.cuerpos.values()) c.label?.setPosition(c.go.x, c.go.y - c.alto);
    for (const p of [...(this.campistas || []), ...(this.currantes || [])]) {
      const pan = p.active && p.getData('pancarta');
      if (pan) pan.setPosition(p.x + 6, p.y - 30);
      const et = p.active && p.getData('etiqueta');
      if (et) et.setPosition(p.x, p.y + 34);
    }
    for (const pr of this.proyectiles) {
      if (pr.active && !pr.getData('armado') && this.enCampoRival(pr.x, pr.getData('bando') || this.ctx.bando)) {
        pr.setData('armado', true); pr.setCollidesWith(MASK.PROY);
      }
    }
    if (this.rastro++ % 3 === 0) for (const pr of this.proyectiles) {
      if (!pr.active) continue;
      const bala = MUNICIONES[pr.getData('municion')].bala;
      const r = this.add.image(pr.x, pr.y, 'pixel').setScale(P * (bala ? 1 : 2)).setTint(bala ? 0xffe066 : 0xffffff).setAlpha(0.6).setDepth(9);
      this.tweens.add({ targets: r, alpha: 0, scale: P * 0.5, duration: bala ? 150 : 500, onComplete: () => r.destroy() });
    }
  }

  async cerrarDisparo() {
    this.setModo('cerrando');
    for (const pr of this.proyectiles) pr.destroy(); this.proyectiles.clear();
    await this.enviarDanos();
    await this.danos?.vaciar?.();
    const enemigo = this.ctx.bando === 'izquierda' ? 'derecha' : 'izquierda';
    const estado = [];
    for (const id of this.rotos) estado.push({ id, x: 0, y: 0, angulo: 0, en_pie: false });
    this.rotos.clear();
    for (const [id, c] of this.cuerpos) {
      const { go, origen, datos } = c;
      const fuera = go.y > SUELO + 50 || go.x < -100 || go.x > W + 100;
      const giro = Math.abs(Phaser.Math.Angle.Wrap(go.rotation - origen.a));
      const caido = fuera || Phaser.Math.Distance.Between(go.x, go.y, origen.x, origen.y) > DISTANCIA_DERRIBO || giro > 1.4;
      const enPie = !(caido && datos.bando === enemigo);
      // guardamos la posición ordenada original: al recargar, todo vuelve a su hueco
      estado.push({ id, x: datos.x, y: datos.y, angulo: 0, en_pie: enPie });
    }
    for (const pr of this.proyectiles) pr.destroy(); this.proyectiles.clear();
    await this.ctx.alTerminarDisparo?.(estado);
    this.setModo('ver');
  }

  /** Coloca un bloque temporal y devuelve su posición ya asentada. */
  probarColocacion(x, y, ancho, alto) {
    return new Promise((res) => {
      const r = this.add.rectangle(x, y, ancho, alto, 0xffffff, 0.6);
      const go = this.matter.add.gameObject(r, { density: 0.001, friction: 0.9, collisionFilter: filtro('BLOQUE') });
      this.time.delayedCall(1200, () => { const out = { x: Math.round(go.x), y: Math.round(go.y) }; go.destroy(); res(out); });
    });
  }
}

export function crearJuego(ctx) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent: 'phaser', width: W, height: H, backgroundColor: '#16161a',
    pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'matter', matter: { gravity: { y: 1 }, enableSleeping: true, debug: false } },
    scene: [],
    callbacks: { postBoot: (game) => game.scene.add('campo', Campo, true, ctx) },
  });
}
