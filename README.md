# Guerra de Bandos

Juego web móvil de catapultas políticas: **acampada en la Puerta del Sol** contra **las torres de oficinas**.
Cada bloque es un argumento sobre el tema de la semana; cada disparo puede llevar una réplica.

Web 100 % estática (sin compilar): Phaser y Supabase se cargan desde CDN, lista para **GitHub Pages**.

## Publicar en GitHub Pages
```
cd ~/Documents/guerra-de-bandos
git init && git add . && git commit -m "Guerra de Bandos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/guerra-de-bandos.git
git push -u origin main
```
En GitHub: Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
Quedará en `https://TU_USUARIO.github.io/guerra-de-bandos/`.

## Probar en local
`npx serve .` (o `python3 -m http.server`) y abre la dirección desde el móvil en la misma wifi.

## Cómo funciona
- Sin códigos ni registros: se te identifica por **IP**; el nombre es opcional.
  Ojo: quien comparta wifi comparte IP, y en datos móviles la IP puede cambiar.
- Construir consume créditos; cada jugador tiene 2 disparos manuales gratuitos al día, aplicados en el servidor.
- Los "me gusta" endurecen el bloque: cartón → madera → ladrillo → piedra → acero.
- Fotos de portada: Wikimedia Commons (licencia libre), con crédito en cada tarjeta.

## Supabase
Tablas: partidas, temas, jugadores, jugador_tokens (secreto), bloques, likes, disparos.
El navegador solo lee; toda escritura pasa por funciones RPC (`entrar`, `quien_soy`, `poner_bloque`, `dar_like`, `disparar`…).
La clave de `src/config.js` es la *publishable*, pensada para ser pública.

## Administrar la partida

El botón **Administrar partida** está disponible en la entrada y durante el juego. Entra con tu contraseña, consulta el estado y pulsa **Iniciar partida** o **Terminar partida**. Terminar requiere confirmación, bloquea las acciones para todos y conserva argumentos y puntos. Iniciar vuelve a abrir ese mismo tablero.

La migración `supabase/migrations/202610120001_admin.sql` añade funciones protegidas y comprueba el estado también en el servidor. Para configurar tu contraseña, abre el editor SQL (lenguaje de consultas estructuradas) de Supabase, copia `supabase/configurar-admin.sql.example`, sustituye el marcador por tu contraseña y ejecútalo tú. No guardes la contraseña en el repositorio ni en los archivos públicos. La contraseña se guarda mediante un resumen bcrypt, no como texto legible.

La sesión dura una hora y se cierra al cerrar el panel; solo vive en memoria. Se permiten cinco intentos por dirección IP (protocolo de Internet) cada quince minutos. Cambiar la contraseña con el mismo script invalida todas las sesiones.

En el panel de administración, **Ayudar a un jugador** permite elegir destinatario por nombre y bando, ver su saldo y **Añadir presupuesto** para el día actual. **Construir para este jugador** crea una pieza de su bando a su nombre, sin cobrarle créditos. El servidor valida la sesión, el destinatario y la pieza. Los reintentos no duplican las ayudas. Los jugadores reciben la actualización del saldo en un máximo de diez segundos.

Verificación: `npm test` prueba accesos y controles del panel. `tests/admin-actions.sql` comprueba presupuesto, gasto real, construcciones para ambos bandos, reintentos y permisos dentro de una transacción revertida.

Como administrador puedes usar **Probar ambos bandos → Jugar como Acampada / Jugar como Torres**. Cambia el bando de tu jugador tantas veces como quieras; cierra el panel para jugar. Se conservan las piezas ya colocadas, el gasto diario y los créditos extra. El presupuesto base se adapta al bando elegido. Espera a que termine un ataque antes de cambiar.


## Reglas de disparo
No hay disparos ni daño de ambiente automáticos. Cada jugador puede confirmar dos disparos gratuitos al día; se renuevan a medianoche en Europe/Madrid. El botón muestra los disparos disponibles. Cambiar de bando o abrir otra pestaña no renueva el cupo. El servidor reserva el disparo antes de animarlo y los reintentos no lo cuentan dos veces. Las piedras, adoquines, pelotas y bombas son gratis; construir mantiene su precio en créditos. La representación de ataques remotos es visual y no duplica el daño.

Pruebas: `tests/ataques-gratis.sql` comprueba gratuidad, cuota, reintentos, renovación y precios de construcción con datos revertidos. `tests/projectiles.test.mjs` comprueba trayectorias válidas y ausencia de disparos de ambiente.

Como administrador, **Disparos de todos → Restablecer disparos de todos** devuelve dos disparos disponibles a cada jugador de la partida, tras confirmar. Se conserva el historial, los puntos y el presupuesto; los ataques en curso pueden terminar. Los demás jugadores ven el contador actualizado en un máximo de diez segundos. Una nueva pulsación confirmada permite volver a reiniciar el cupo cuando lo necesites.
