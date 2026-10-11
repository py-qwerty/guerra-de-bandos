---
version: alpha
colors:
  izquierda: '#c8102e'
  derecha: '#1f3a68'
  primary: '#f2c230'
  background: '#16161a'
  text: '#f4f1ea'
  surface: '#23232b'
  muted: '#bcbcc8'
  danger: '#a70d29'
typography:
  body:
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif'
  utility:
    fontFamily: 'Press Start 2P, monospace'
rounded:
  button: '0px'
  panel: '0px'
spacing:
  control: '12px'
  panel: '22px'
---
# Guerra de Bandos

## Overview
Juego social de catapultas para móvil. El panel es una mesa de control dentro del mismo juego: tablero oscuro, estado destacado y acciones claras. Mantener la identidad roja y azul de los dos bandos. Evitar una consola de comandos críptica o una nueva estética de aplicación corporativa.

## Colors
Los tokens de `src/style.css` son la fuente de verdad. izquierda → --izq; derecha → --der; primary → --oro; background → --fondo; text → --txt. surface, muted y danger tienen variables del mismo nombre. El amarillo señala la acción y el estado; el rojo oscuro se reserva para la confirmación de cierre.

## Typography
Sistema para lectura y formularios; Press Start 2P para botones y marcadores del juego. Español de España; fechas en Europe/Madrid.

## Layout
Diálogo de 600 píxeles como máximo con desplazamiento propio. En móvil mantiene 12 píxeles de margen y adapta los botones. Su cabecera conserva acceso al cierre. En la entrada, Admin está arriba a la derecha; jugando ocupa 62 píxeles en la misma fila que los controles. Conserva un área táctil de 44 píxeles de alto. En horizontal se compactan las barras y se respetan las zonas seguras del móvil. Phaser centra el campo completo sin un segundo centrado CSS. Los diálogos cortos en altura tienen desplazamiento propio.

## Elevation & Depth
Fondo modal oscuro; superficies planas. El tablero de estado se distingue mediante una banda amarilla.

## Shapes
Botones y panel sin redondear, con borde negro y sombra desplazada, siguiendo la actualización del juego a píxeles.

## Components
Controles nativos. El panel usa dialog para foco, Escape y aislamiento del fondo. La hoja global define estados de botones, foco y barras de desplazamiento. El estado incluye texto, además de color.

## Do's and Don'ts
Conservar tablero al terminar e iniciar. Ocultar contraseñas por defecto y permitir pegado. No guardar secretos en el navegador. Respetar movimiento reducido y zoom. No incorporar comandos técnicos a los controles del administrador.
