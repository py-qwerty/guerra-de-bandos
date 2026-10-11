// Sprites pixel art generados en código (sin archivos externos).
// Cada carácter es un píxel; '.' es transparente. Se dibujan a 1px y se escalan x4 en el juego.

export const P = 4; // tamaño del píxel en pantalla

export const PALETA = {
  k: '#1a1a1a', w: '#ffffff', r: '#c8102e', R: '#8a0a1f', o: '#ff7f27', y: '#f2c230', Y: '#c99a12',
  g: '#3fae5a', G: '#1e6b3a', b: '#3a6ea5', B: '#1f3a68', p: '#7d55b0', P: '#d94f70',
  s: '#f1c27d', S: '#b97a48', h: '#5b3a1e', H: '#e0c068', n: '#8b5a2b', N: '#5b3a1e',
  a: '#8a8a8a', A: '#4b4b4b', l: '#c8c8c8', c: '#bfe3ff', C: '#6fa8d6', d: '#2f3e52',
  f: '#ffb000', F: '#ff4500', e: '#e8cfa3', E: '#c9ad7f', m: '#9fd36b', t: '#d8b26a', T: '#a37b3c',
};

function cuadra(filas) {
  const w = Math.max(...filas.map((f) => f.length));
  return filas.map((f) => f.padEnd(w, '.'));
}

export function crearTextura(escena, clave, filas, cambios = {}) {
  if (escena.textures.exists(clave)) return clave;
  const f = cuadra(filas);
  const w = f[0].length, h = f.length;
  const tex = escena.textures.createCanvas(clave, w, h);
  const ctx = tex.getContext();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ch = f[y][x];
    if (cambios[ch]) ch = cambios[ch];
    if (ch === '.') continue;
    ctx.fillStyle = PALETA[ch] || ch;
    ctx.fillRect(x, y, 1, 1);
  }
  tex.refresh();
  return clave;
}

// ---------- Personajes ----------
export const CAMPISTA = [
  '..hhhh..',
  '.hhhhhh.',
  '.hskskh.',
  '.hssssh.',
  '..sNNs..',
  '...ss...',
  '.XXXXXX.',
  'sXXXXXXs',
  'sXXXXXXs',
  '..XXXX..',
  '..BB.BB.',
  '..BB.BB.',
  '..kk.kk.',
];
// manos arriba: el aplauso silencioso de las asambleas
export const CAMPISTA_MANOS = [
  's.hhhh.s',
  's.hhhhhs',
  's.hskskh',
  'sXhssssh',
  '.XXsNNs.',
  '..XXss..',
  '..XXXX..',
  '..XXXX..',
  '..XXXX..',
  '..XXXX..',
  '..BB.BB.',
  '..BB.BB.',
  '..kk.kk.',
];
export const CURRANTE = [
  '..hhhh..',
  '.hhhhhh.',
  '.sksksh.',
  '.sssss..',
  '..skks..',
  '...ss...',
  '.XXwwXX.',
  'sXXrrXXs',
  'sXXrrXXs',
  '..XXXX.n',
  '..XX.XXN',
  '..XX.XX.',
  '..kk.kk.',
];
export const CURRANTE_CAFE = [
  '..hhhh..',
  '.hhhhhh.',
  '.sksksh.',
  '.sssss.w',
  '..skks..',
  '...ss.ww',
  '.XXwwXs.',
  'sXXrrX..',
  'sXXrrX..',
  '..XXXX..',
  '..XX.XX.',
  '..XX.XX.',
  '..kk.kk.',
];

// ---------- Escenario ----------
export const TIENDA = [
  '.......kk.......',
  '......kXXk......',
  '.....kXXXXk.....',
  '....kXXxXXXk....',
  '...kXXxxXXXXk...',
  '..kXXxxkkXXXXk..',
  '.kXXxxkkkkXXXXk.',
  'kXXxxxkkkkXXXXXk',
  'kXXxxxkkkkXXXXXk',
  'kkkkkkkkkkkkkkkk',
];
export const OSO = [
  '..kk....kk......',
  '.knnk..knnk.....',
  '.knnnnnnnnk..GG.',
  '..knkknnnnk.GgGG',
  '..knnnnnnnnkGgrG',
  '...knNNnnnnnkGGr',
  '...knnnnnnnnnkG.',
  '....knnnnnnnnnk.',
  '....knnnnnnnnnk.',
  '....kn.kn.kn.nk.',
  '..aaaaaaaaaaaa..',
  '..aAAAAAAAAAAa..',
  '..aAAAAAAAAAAa..',
  '..aaaaaaaaaaaa..',
];
export const BIDON = [
  '.f.F.f..',
  'FfFfFfF.',
  'fFyfyFf.',
  'kAAAAAAk',
  'kaAaAaAk',
  'kAAAAAAk',
  'kaAaAaAk',
  'kAAAAAAk',
];
export const BIDON2 = [
  'F..f.F..',
  '.fFyFf..',
  'FyfFfyF.',
  'kAAAAAAk',
  'kaAaAaAk',
  'kAAAAAAk',
  'kaAaAaAk',
  'kAAAAAAk',
];
export const PALOMA = [
  '.aa.....',
  'aakaa.a.',
  '.aaaaaa.',
  '...y....',
];
export const PALOMA2 = [
  '....a...',
  '.aakaa..',
  'aaaaaaa.',
  '...y....',
];
export const NUBE = [
  '.....wwww.......',
  '...wwwwwwww.....',
  '.wwwwwwwwwwwww..',
  'wwwwwwwwwwwwwwww',
  '.llllllllllllll.',
];
export const HONDA = [
  'n......n',
  'nn....nn',
  '.nn..nn.',
  '..nnnn..',
  '...nn...',
  '...nn...',
  '...nn...',
  '...NN...',
  '...NN...',
  '..NNNN..',
];

// Bloques de edificio: se generan por código
export function texSegmentoTorre(escena, clave, cuerpo, luz) {
  const filas = [];
  for (let y = 0; y < 16; y++) {
    let f = '';
    for (let x = 0; x < 20; x++) {
      if (x === 0 || x === 19) f += 'k';
      else if (y % 4 === 1 || y % 4 === 2) f += (x % 3 === 1 || x % 3 === 2) ? (((x * 7 + y * 13) % 11 === 0) ? luz : 'c') : cuerpo;
      else f += cuerpo;
    }
    filas.push(f);
  }
  return crearTextura(escena, clave, filas);
}

export function texCorreos(escena, clave) {
  const filas = [];
  for (let y = 0; y < 15; y++) {
    let f = '';
    for (let x = 0; x < 25; x++) {
      if (y === 0 || y === 14) f += 'E';
      else if (y >= 4 && y <= 11 && (x % 6 === 2 || x % 6 === 3)) f += y === 4 ? 'w' : 'B';
      else f += (x + y) % 9 === 0 ? 'E' : 'e';
    }
    filas.push(f);
  }
  return crearTextura(escena, clave, filas);
}

export function texReloj(escena) {
  return crearTextura(escena, 'reloj', [
    '........yy..........',
    '.......yyyy.........',
    '........yy..........',
    '........aa..........',
    'EEEEEEEEEEEEEEEEEEEE',
    'eeeeeewwwwwwweeeeeee',
    'eeeeewwwwkwwwweeeeee',
    'eeeewwwwwkwwwwweeeee',
    'eeeewwwwwkkkkwweeeee',
    'eeeewwwwwwwwwwweeeee',
    'eeeeewwwwwwwwweeeeee',
    'eeeeeewwwwwwweeeeeee',
    'eeeeeeeeeeeeeeeeeeee',
    'eeeEEeeeEEeeeEEeeeee',
    'EEEEEEEEEEEEEEEEEEEE',
  ]);
}

const MATERIAL_PIX = {
  carton:   (x, y) => ((x * 5 + y * 3) % 7 === 0 ? 'T' : 't'),
  madera:   (x, y) => (y % 3 === 0 ? 'N' : ((x + y * 4) % 9 === 0 ? 'N' : 'n')),
  ladrillo: (x, y) => (y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 3) % 6 === 0 ? 'l' : 'r'),
  piedra:   (x, y) => ((x * 3 + y * 7) % 5 === 0 ? 'A' : ((x + y) % 4 === 0 ? 'l' : 'a')),
  acero:    (x, y) => ((x === 1 || x === -2) && y % 4 === 1 ? 'l' : ((x + y) % 6 === 0 ? 'C' : 'd')),
};

export function texBloque(escena, material, ancho, alto, bando) {
  const w = Math.max(3, Math.round(ancho / P)), h = Math.max(3, Math.round(alto / P));
  const clave = `blk_${material}_${w}x${h}_${bando}`;
  const borde = bando === 'izquierda' ? 'r' : 'B';
  const pix = MATERIAL_PIX[material] || MATERIAL_PIX.carton;
  const filas = [];
  for (let y = 0; y < h; y++) {
    let f = '';
    for (let x = 0; x < w; x++) f += (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? borde : pix(x === w - 2 ? -2 : x, y);
    filas.push(f);
  }
  return crearTextura(escena, clave, filas);
}

// ---------- Munición ----------
export const MUNICIONES = {
  piedra:  { emoji: '🪨', nombre: 'Piedra', coste: 0, cantidad: 1, vuelo: 70, bando: 'izquierda', radio: 9, densidad: 0.012, rebote: 0.2,
    filas: ['.aaaa.', 'aalaaa', 'alaaAa', 'aaaAAa', '.aAAa.'] },
  adoquin: { emoji: '🧱', nombre: 'Adoquín', coste: 0, cantidad: 1, vuelo: 65, bando: 'izquierda', radio: 13, densidad: 0.03, rebote: 0.1,
    filas: ['AAAAAAA', 'AllaaaA', 'AlaaaaA', 'AaaaaaA', 'AaaaaAA', 'AAAAAAA'] },
  pelota:  { emoji: '⚫', nombre: 'Pelota de goma', coste: 0, cantidad: 1, vuelo: 60, bando: 'derecha', radio: 12, densidad: 0.03, rebote: 0.85,
    filas: ['..kkkk..', '.kkAkkk.', 'kkAkkkkk', 'kkkkkkkk', 'kkkkkkkk', 'kkkkkkkk', '.kkkkkk.', '..kkkk..'] },
  bomba:   { emoji: '💣', nombre: 'Bomba', coste: 0, cantidad: 1, vuelo: 65, bando: 'derecha', radio: 16, densidad: 0.03, rebote: 0.2, explota: 190,
    filas: ['......fF', '.....n..', '....kk..', '..kkkkkk', '.kkAkkkkk', 'kkAkkkkkk', 'kkkkkkkkk', 'kkkkkkkkk', '.kkkkkkk.', '..kkkkk..'] },
};
export const MUNICION = {
  izquierda: ['piedra', 'adoquin'],
  derecha: ['pelota', 'bomba'],
};

// Lo que cada bando puede construir (mismo precio que en la base de datos)
export const PIEZAS = {
  tienda:      { emoji: '⛺', nombre: 'Tienda de campaña', coste: 10, bando: 'izquierda', ancho: 64, alto: 40 },
  perroflauta: { emoji: '🧑‍🎤', nombre: 'Perroflauta', coste: 15, bando: 'izquierda', ancho: 32, alto: 52 },
  planta:      { emoji: '🏢', nombre: 'Planta de oficinas', coste: 40, bando: 'derecha', ancho: 80, alto: 64 },
  currante:    { emoji: '👔', nombre: 'Currante', coste: 20, bando: 'derecha', ancho: 32, alto: 52 },
};
export const PRESUPUESTO = { izquierda: 100, derecha: 200 };
