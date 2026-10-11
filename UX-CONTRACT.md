# Contrato de interacción

Fuente de negocio: petición del usuario de administrar el inicio y fin mediante contraseña; juego existente en README.md y src/api.js. Identidad visual en DESIGN.md.

| Capacidad | Responsable canónico | Variantes | Verificación |
|---|---|---|---|
| Form | src/admin.js; etiquetas y campos nativos | acceso con contraseña | vacío, error, envío bloqueado |
| Scrollbar | src/style.css | desplazamiento propio del diálogo | auditoría estática y móvil |
| Toast | src/ui.js aviso; estado persistente en admin.js | juego / panel modal | regiones de estado |
| CRUD | src/api.js adminApi; funciones de Supabase y tests/admin-actions.sql | leer / iniciar / terminar | prueba SQL revertida |
| Select/Listbox | select nativo del juego | catálogo de piezas y destinatario de administración | heredado, fuera del cambio |

Administrar partida tiene un botón en la entrada y otro en la barra inferior del juego. Ambos abren el mismo diálogo. Escape y Cerrar vuelven al botón que lo abrió y cierran la sesión. Credenciales y token permanecen solo en memoria; sesión de una hora, cinco intentos por quince minutos. Servidor valida cada operación; tablas privadas inaccesibles a clientes.

Partida general: en curso permite acciones; terminada bloquea nuevas construcciones, apoyos, disparos y jugadores en servidor. Iniciar reabre el mismo tablero, no crea un tablero vacío. Terminar confirma el efecto para todos, sin borrar datos. Operaciones repetidas son idempotentes. El panel permanece abierto con resultado y permite consultar de nuevo el estado.

Errores visibles en el panel, región de estado para espera y éxito, controles bloqueados durante solicitudes. Cierre invalida resultados pendientes. La pérdida de red permite reintentar; el servidor es la fuente de verdad. Los jugadores consultan estado cada diez segundos; las escrituras quedan protegidas inmediatamente.

La contraseña inicial la define el propietario desde Supabase. Nunca se ofrece un alta pública de administrador. Antes de eso el acceso explica que falta configuración.


Administración de jugadores: admin_jugadores devuelve nombre, bando y saldo, sin direcciones IP ni tokens. El administrador elige un jugador de la partida general. Añadir presupuesto suma entre 1 y 100000 créditos por operación para el día actual, con tope de un millón de créditos extra por jugador y día. Sigue el mismo corte diario del presupuesto del juego. El saldo ampliado se utiliza tanto para construir como para atacar.

Construir para este jugador solo muestra piezas de su bando; atribuye la pieza al destinatario y no descuenta saldo. Requiere partida activa. Funciona también desde la entrada al juego. Validación y permisos se comprueban en servidor. Un identificador por operación impide que un reintento duplique una ayuda; se mantiene hasta éxito o cambio de operación. La lista muestra un estado vacío si no hay jugadores. Actualizar estado vuelve a leer saldos; el jugador recibe su saldo actualizado en un máximo de diez segundos.

Verificación: tests/admin-ui.test.mjs prueba el formulario con un documento simulado; tests/admin-actions.sql prueba transacciones y revierte sus datos. La comprobación en navegador real de esta ampliación quedó pendiente porque la herramienta de control del navegador agotó su tiempo de respuesta.


Probar ambos bandos: solo el administrador autenticado puede cambiar el bando de su jugador mediante admin_bando. Los botones Jugar como Acampada / Jugar como Torres muestran el bando actual y deshabilitan la opción ya elegida. El cambio se puede repetir sin consumir el cambio ordinario de bando, conserva piezas y gasto, y aplica el presupuesto base del bando nuevo. No se permite cambiar durante un ataque. Se actualizan la escena, los catálogos, el ataque disponible y el saldo; se mantiene abierta la sesión de administración. Verificado en el navegador: Acampada → Torres → Acampada, con actualización de Fuego y saldo. Prueba de servidor en tests/admin-team.sql, revertida.


Regla aprobada por el usuario: dos disparos gratuitos por jugador y día (medianoche Europe/Madrid); construir consume presupuesto. No hay temporizadores de disparo ni daños de ambiente. Iniciar ataque reserva uno de los dos disparos antes de la animación y requiere partida activa. El identificador de operación permite reintentar sin duplicar cupo. Terminar ataque guarda el resultado una sola vez. Los daños solo se guardan durante un ataque autorizado reciente; los clientes remotos representan el ataque sin volver a causar daño. No se restan créditos de los ataques del presupuesto. El contador persiste al cambiar de bando, recargar o usar otra pestaña. Se deshabilita Atacar cuando no hay disparos; Construir sigue disponible con crédito.


Excepción administrativa aprobada por el usuario: Restablecer disparos de todos devuelve dos disparos disponibles a cada jugador de la partida general. Confirmación dentro del panel con Cancelar enfocado primero. El servidor valida la sesión y aplica el reinicio bajo bloqueo de jugadores; un identificador de operación evita repetir un mismo reinicio tras un error de red. Se conserva el historial mediante la marca cuenta_cupo, sin borrar ataques. No afecta puntos ni créditos; no cancela ataques en curso. Se anuncia el número de jugadores afectados. El administrador actualiza su contador inmediatamente y el resto mediante la consulta periódica de diez segundos. tests/admin-reset-shots.sql prueba la operación con datos revertidos; tests/admin-ui.test.mjs comprueba confirmación y cancelación.


Proyectiles: se arman al cruzar al campo rival y conservan el bando del lanzador. Una bomba no detona en el campo propio ni por un contacto temprano con el suelo. La explosión aplica impulso, pérdida de píxeles y daño solo a objetivos rivales dentro de su radio. Las piezas aliadas quedan excluidas, incluso si están junto a un objetivo enemigo. Regresiones verificadas en tests/projectiles.test.mjs.


Vista móvil: Admin abre el mismo panel desde un control compacto con nombre accesible Administrar partida. La barra inferior permanece en una fila, con objetivos táctiles de al menos 44 píxeles de alto. La vista horizontal conserva ambos bandos completos; las barras respetan las zonas seguras y los diálogos permiten desplazamiento en pantallas de poca altura.


Cierre de partida: petición del propietario del 12/10/2026. Todos los clientes vuelven a la entrada, con nombre vacío, al detectar el cierre. Se detienen escena, consultas y suscripción, se cancelan selectores abiertos y se conserva el tablero en servidor. Al recargar se reanuda automáticamente la misma ronda activa. Al cerrar o cambiar iniciada_at se exige elegir nombre y bando otra vez. Se recuerda localmente solo el identificador de ronda, su fecha de inicio y el identificador del jugador; nunca credenciales. Entrar exige partida activa. La detección combina eventos y consulta cada diez segundos, y comprueba de nuevo al recuperar una pestaña suspendida. Un cambio de iniciada_at detecta cierre y reapertura entre consultas. El administrador conserva abierto su panel para iniciar otra vez.
