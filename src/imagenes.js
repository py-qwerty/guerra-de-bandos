// Fotos reales con licencia libre (Wikimedia Commons, CC0), guardadas en la carpeta img/.
const base = 'img/';

const FOTOS = {
  izquierda: { src: base + 'sol.jpg', credito: 'Acampada Sol 2011 · Zarateman · CC0',
    pagina: 'https://commons.wikimedia.org/wiki/File:Madrid_-_Acampada_Sol_2011_35.JPG' },
  derecha: { src: base + 'torres.jpg', credito: 'Cuatro Torres, Madrid · Zarateman · CC0',
    pagina: 'https://commons.wikimedia.org/wiki/File:Madrid_-_Cuatro_Torres_Business_Area_(CTBA)_01.JPG' },
};

export async function fotoDe(bando) { return FOTOS[bando]; }
