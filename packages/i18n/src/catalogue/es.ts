/**
 * Spanish.
 *
 * The Dutch terms of art are kept untranslated — flensstok, Pankouk, FLENS! —
 * because they are the names of things in this game, not descriptions of them.
 */

import type { Catalogue } from './types.js';

export const es = {
  'app.name': 'Flens',
  'language.label': 'Idioma',
  'language.en': 'English',
  'language.nl': 'Nederlands',
  'language.es': 'Español',

  'setup.blurb.origin':
    'Un juego de cartas familiar de Groninga, conocido también como Flintjen, Pankouk, Pang o Perry’s spel.',
  'setup.blurb.goal': 'Compite por vaciar tu *flensstok* construyendo del 1 al {top} en el centro.',
  'setup.blurb.warning': 'Juega fuera de secuencia y alguien gritará *¡FLENS!*',
  'setup.opponents': 'Rivales',
  'setup.difficulty': 'Dificultad',
  'setup.difficulty.easy': 'Fácil — descuidado, tarda en darse cuenta',
  'setup.difficulty.normal': 'Normal',
  'setup.difficulty.hard': 'Difícil — casi nunca falla y salta rápido',
  'setup.buildUpTo': 'Construir hasta',
  'setup.topValue.16': '16 (el original de Perry)',
  'setup.topValue.15': '15 (las descripciones del Pang)',
  'setup.hints': 'Muéstrame los errores',
  'setup.hints.help':
    'Muestra una cuenta atrás cada vez que alguien se equivoca. Va bien para aprender las reglas, pero detectarlos por tu cuenta es el juego de verdad.',
  'setup.playBots': 'Jugar contra bots',
  'setup.playOnline': 'Jugar en línea con amigos',
  'setup.learn': 'Aprender a jugar — nueve manos, unos cinco minutos',

  'table.supply': 'Construyendo 1–{top} · {count} en la reserva',
  'table.clock': '{seconds}s',
  'table.mute': 'Silenciar',
  'table.unmute': 'Activar el sonido',
  'table.soundOn': 'Sonido activado',
  'table.soundOff': 'Sonido desactivado',
  'table.newDeal': 'Repartir de nuevo',
  'table.changeSetup': 'Cambiar la configuración',
  'table.leave': 'Salir',

  'result.draw': 'Empate — nadie podía mover',
  'result.youWin': '¡Ganas!',
  'result.wins': '{name} gana',
  'result.playAgain': 'Jugar otra vez',

  'centre.title': 'Centro',
  'centre.done': 'completa',
  'centre.needs': 'quiere {value}',

  'seat.flensstok': 'flensstok {count}',
  'card.stok': 'stok',
  'card.hand': 'mano',

  'you.title': 'Tú',
  'you.yourTurn': 'tu turno',
  'you.waiting': 'esperando…',
  'you.flensstok': 'Flensstok ({count})',
  'you.openPiles': 'Montones abiertos — haz clic en uno para descartar',
  'you.hand': 'Mano',
  'you.pass': 'Nada que jugar — pasa',

  'flens.call': '¡FLENS!',
  'flens.hint':
    'Cántalo cuando alguien juegue fuera de secuencia o termine su turno teniendo una jugada disponible. Si te equivocas: dos cartas a tu propio flensstok.',
  'flens.slipped': '{name} se ha equivocado · {seconds}s',

  'log.title': 'La mesa habla',

  'lobby.connecting': 'Conectando…',
  'lobby.disconnected': 'Sin conexión',
  'lobby.disconnected.body':
    'Se ha perdido la conexión con el servidor. ¿Está en marcha? Prueba `npm run dev --workspace @flens/server` y recarga la página.',
  'lobby.room': 'Sala {code}',
  'lobby.share': 'Comparte el código *{code}* con quien vaya a jugar.',
  'lobby.you': '(tú)',
  'lobby.host': 'anfitrión',
  'lobby.botTag': 'bot · {difficulty}',
  'lobby.ready': 'listo',
  'lobby.away': 'ausente',
  'lobby.remove': 'quitar',
  'lobby.addBot': '+ bot {difficulty}',
  'lobby.start': 'Empezar la partida',
  'lobby.needTwo': 'Hacen falta al menos dos jugadores',
  'lobby.waitingHost': 'Esperando a que el anfitrión empiece…',
  'lobby.title': 'Jugar en línea',
  'lobby.yourName': 'Tu nombre',
  'lobby.buildUpTo': 'Construir hasta',
  'lobby.create': 'Crear una sala',
  'lobby.or': 'o',
  'lobby.roomCode': 'Código de sala',
  'lobby.join': 'Entrar',
  'lobby.back': 'Atrás',
  'lobby.leave': 'Salir',
  'lobby.hostName': 'Anfitrión',
  'lobby.playerName': 'Jugador',

  'difficulty.easy': 'fácil',
  'difficulty.normal': 'normal',
  'difficulty.hard': 'difícil',

  'discord.signInFailed':
    'La Activity no ha podido completar el inicio de sesión con Discord. Comprueba que el client id corresponde a la aplicación y que el servidor tiene su client secret.',
  'discord.connecting': 'Conectando con Discord…',
  'discord.sameTable':
    'Todo el que abra esta Activity se sienta a la misma mesa. Esperando para empezar…',

  'tutorial.progress': '{index} / {count}',
  'tutorial.watching': 'Estoy mirando →',
  'tutorial.finish': 'Terminar →',
  'tutorial.next': 'Siguiente →',
  'tutorial.reset': 'Reiniciar',
  'tutorial.skip': 'Saltarme esta',
  'tutorial.leave': 'Salir',
  'tutorial.bug': 'Esto debería haber funcionado — sáltate la lección y cuenta qué habías pulsado.',
  'tutorial.windowClosed': 'Se ha ido — la ventana dura seis segundos. Otra vez.',
  'tutorial.wrongCall':
    'No hay nada que cantar — un ¡FLENS! equivocado te cuesta dos cartas a tu propio flensstok.',
  'tutorial.pileWants': 'Ese montón espera un {wants}. Busca el que quiere un {value}.',
  'tutorial.runFinished': 'Esa serie ya está completa. Prueba otro montón.',
  'tutorial.graduated.title': 'Ya sabes jugar',
  'tutorial.graduated.body':
    'Tres cosas que las lecciones se han dejado, porque solo muerden en una partida de verdad:',
  'tutorial.graduated.clock':
    'Un turno dura *45 segundos*. Si se te acaba, la mesa descarta por ti — y si tenías una jugada disponible, es una infracción como cualquier otra.',
  'tutorial.graduated.stands':
    'El error que nadie caza *se queda*. La carta equivocada permanece en el montón y la serie sigue desde ahí. Por eso mira todo el mundo.',
  'tutorial.graduated.silent':
    'Nada señala una infracción. Ni barra, ni brillo, ni sonido — la cuenta atrás de la lección 6 solo existe aquí y en la opción “muéstrame los errores”.',
  'tutorial.graduated.play': 'Jugar contra bots',
  'tutorial.graduated.menu': 'Volver al menú',

  'lesson.centre.title': 'El centro empieza en uno',
  'lesson.centre.body':
    'Cuatro montones en medio de la mesa. Todos empiezan en 1 y suben hasta 16, y cualquier jugador puede añadir a cualquier montón. Ese es todo el motor del juego.',
  'lesson.centre.task': 'Coge tu 1 y ponlo en un montón central vacío.',
  'lesson.centre.done': 'Ese montón quiere un 2 ahora — de quien sea, en cualquier turno.',
  'lesson.centre.nudge':
    'Los montones centrales están todos vacíos, y un montón vacío solo acepta un 1.',

  'lesson.flensstok.title': 'Tu flensstok es la carrera',
  'lesson.flensstok.body':
    'La pila de la izquierda es tu flensstok: diez cartas boca abajo, y solo se ve la de arriba. Vacíala y ganas. Todo lo demás en la mesa es solo una forma de llegar a ella, y por eso juegas desde ahí siempre que puedes.',
  'lesson.flensstok.task': 'El centro quiere un 5, y hay un 5 encima de tu flensstok. Juégalo.',
  'lesson.flensstok.done': 'Quedan nueve. Cada carta que sacas de esa pila acorta la partida.',
  'lesson.flensstok.nudge': 'Nada de tu mano encaja. Mira la carta de arriba de tu flensstok.',

  'lesson.priority.title': 'El flensstok va primero',
  'lesson.priority.body':
    'Tienes un 7 en la mano y hay un 7 en tu flensstok. Para el centro son la misma carta, así que la regla dice que sale el del flensstok. Si no, podrías quedarte sentado sobre tu pila para siempre y no perder nunca.',
  'lesson.priority.task': 'Juega el 7 — desde el sitio correcto.',
  'lesson.priority.done': 'Correcto. El 7 de la mano se queda; el del flensstok no podía esperar.',
  'lesson.priority.nudge':
    'Los dos son sietes, y ahí está justo la trampa. Jugar el de la mano mientras el mismo valor está encima de tu flensstok es una infracción — ignorar el flensstok — y es cantable.',

  'lesson.discard.title': 'Terminar tu turno',
  'lesson.discard.body':
    'Nada de lo que tienes encaja en ningún sitio. Cuando no puedes jugar, terminas el turno poniendo una carta de tu mano en uno de tus cuatro montones abiertos. Esos montones están boca arriba y luego puedes jugar desde arriba, así que dónde pones cada carta importa.',
  'lesson.discard.task': 'Descarta una carta en un montón abierto.',
  'lesson.discard.done':
    'Turno terminado. Entierra mal una carta y estarás desenterrándola el resto de la partida.',
  'lesson.discard.nudge': 'Nada de aquí llega al centro. La única salida de este turno es un descarte.',

  'lesson.voorrang.title': 'Si puedes jugar, tienes que jugar',
  'lesson.voorrang.body':
    'Esta es la regla de la que cuelga todo el juego. Terminar tu turno cuando aún había una jugada legal al centro es una infracción, y es el canto que más vas a oír en una mesa de verdad, porque es el más fácil de cometer sin darte cuenta.',
  'lesson.voorrang.task': 'Tu 6 encaja en el primer montón. Juégalo en vez de descartar.',
  'lesson.voorrang.done':
    'Bien. Compara el centro con todo lo que puedes alcanzar antes de terminar un turno.',
  'lesson.voorrang.nudge':
    'Algo que tienes en la mano sí llega al centro. Encuéntralo antes de terminar el turno.',
  'lesson.voorrang.mistake':
    'Y ahí está. Terminaste el turno con una jugada disponible, {opponent} lo cantó, y su montón abierto está ahora enterrado bajo el tuyo para que lo desentierres. Otra vez — esta vez juega el 6.',

  'lesson.spot.title': 'Alguien tiene que cantarlo',
  'lesson.spot.body':
    'Nada en este juego impide que baje una carta equivocada. El motor deja caer tranquilamente un 9 en un montón que espera un 3, y ahí se queda, contando, salvo que otro jugador grite ¡FLENS! en seis segundos. La barra de abajo son ruedines; en una partida de verdad no hay barra.',
  'lesson.spot.task': 'Vigila a {opponent}. En cuanto juegue fuera de secuencia, pulsa ¡FLENS!',
  'lesson.spot.done':
    'Cazado. Su carta sale del montón, y tu montón abierto más pequeño pasa a sus manos.',
  'lesson.spot.nudge':
    'Todavía no hay nada que cantar — y cantar mal te cuesta dos cartas a tu propio flensstok.',

  'lesson.watch.title': 'Ahora sin la barra',
  'lesson.watch.body':
    'La cuenta atrás ya no está, y este error es más silencioso: {opponent} va a terminar su turno con un 6 encima de su flensstok mientras el primer montón central pide un 6. Comparar lo que cada uno alcanza con lo que el centro quiere: esa es la habilidad de verdad del Flens.',
  'lesson.watch.task': 'Si {opponent} termina su turno sin jugar ese 6, cántalo.',
  'lesson.watch.done':
    'Ese es el canto que gana partidas. Todo lo que necesitabas estaba boca arriba: la carta de arriba de su flensstok y lo que pedía el montón.',
  'lesson.watch.nudge': 'Aún no. No ha terminado su turno; hasta que lo haga, no ha hecho nada mal.',

  'lesson.pankouk.title': '¡Pankouk!',
  'lesson.pankouk.body':
    'Termina un montón en 16 y la serie entera se recoge y se baraja de vuelta a la reserva, que es lo que evita que el juego se quede sin cartas. Tradicionalmente quien pone el 16 grita: ¡Pankouk! — tortita. La mitad de los nombres de este juego son comida.',
  'lesson.pankouk.task': 'Pon tu 16 en el montón al que le falta una carta.',
  'lesson.pankouk.done':
    'Dieciséis cartas de vuelta a la circulación, y un montón libre para que alguien empiece en 1.',
  'lesson.pankouk.nudge': 'A un montón le falta una sola carta. Mira qué está pidiendo.',

  'lesson.win.title': '¡Flens!',
  'lesson.win.body':
    'Te queda una carta en el flensstok, y el centro pide exactamente esa. Vacía la pila y la partida acaba en el acto: no hace falta despejar la mano ni los montones abiertos.',
  'lesson.win.task': 'Juega tu última carta del flensstok y gana.',
  'lesson.win.done': 'Flens. Eso es el juego.',
  'lesson.win.nudge': 'El centro quiere un 7, y ya solo queda un sitio de donde sacarlo.',

  // El nombre de un asiento es una etiqueta, no una palabra de la frase: uno de
  // ellos es "Tú". Cada línea nombra la jugada en vez de conjugarla ("Tú jugó" y
  // "Tú jugaste" fallan, cada uno para la mitad de los asientos) y ningún nombre
  // va detrás de una preposición ("de Tú"). Se lee como un acta.
  'log.start': 'Partida iniciada con {count} jugadores',
  'log.play': '{name}: un {value} al montón central {pile}',
  'log.discard': '{name}: descarte de un {value} en el montón abierto {pile}',
  'log.falseCall': {
    one: '{name}: ¡FLENS! injustificado, {count} carta de penalización',
    other: '{name}: ¡FLENS! injustificado, {count} cartas de penalización',
  },
  'log.flens': '¡FLENS! {caller} → {offender} ({detail})',
  'log.flensCards': {
    one: '¡FLENS! {caller} → {offender} ({detail}): entrega de {count} carta',
    other: '¡FLENS! {caller} → {offender} ({detail}): entrega de {count} cartas',
  },
  'log.pass': '{name}: paso, sin jugada posible',
  'log.drawNoMoves': 'nadie puede mover — la partida queda en empate',
  'log.drawIdle': {
    one: 'ninguna jugada al centro en {count} turno — la partida queda en empate',
    other: 'ninguna jugada al centro en {count} turnos — la partida queda en empate',
  },
  'log.timeoutPlay': '{name}: tiempo agotado, la mesa juega un {value}',
  'log.timeoutPass': '{name}: tiempo agotado, paso',
  'log.timeoutDiscard': '{name}: tiempo agotado, descarte de un {value}',
  'log.infraction': '{name}: infracción, {detail}',
  'log.gotAway': '{name}: falta no cantada',
  'log.reverted': 'error no cantado, deshecho ({detail})',
  'log.pankouk': 'montón central {pile} completado — ¡Pankouk!',
  'log.reshuffled': 'las series completadas vuelven barajadas a la reserva',
  'log.recycled': {
    one: '{count} carta enterrada vuelve a la reserva',
    other: '{count} cartas enterradas vuelven a la reserva',
  },
  'log.win': '{name}: ¡victoria!',

  // Read as a clause inside the lines above, so no subject and no tense.
  'infraction.outOfSequence': 'un {value} en un montón que esperaba un {expected}',
  'infraction.ignoredFlensstok':
    'un {value} de la mano teniendo el mismo valor encima del flensstok',
  'infraction.missedCentrePlay': 'fin de turno teniendo una jugada legal al centro',

  'reject.gameOver': 'la partida ha terminado',
  'reject.notYourTurn': 'no es tu turno',
  'reject.noSuchPlayer': 'ese jugador no existe',
  'reject.noCardThere': 'ahí no hay ninguna carta',
  'reject.noSuchCentrePile': 'ese montón central no existe',
  'reject.noCardInHand': 'no hay carta en esa posición de la mano',
  'reject.noSuchOpenPile': 'ese montón abierto no existe',
  'reject.mustPlayOrDiscard': 'tienes que jugar o descartar, no pasar',
  'reject.mustPlay': 'tienes una jugada legal y debes hacerla',
  'reject.backwardsTick': 'el reloj no puede ir atrás',

  'error.malformedMessage': 'mensaje mal formado',
  'error.unrecognisedMessage': 'mensaje no reconocido',
  'error.noRoomWithCode': 'no hay ninguna sala con ese código',
  'error.noSeatHere': 'no tienes sitio en esta sala',
  'error.notInRoom': 'no estás en ninguna sala',
  'error.alreadyStarted': 'esa partida ya ha empezado',
  'error.roomFull': 'esa sala está llena',
  'error.hostOnly': 'solo el anfitrión puede hacer eso',
  'error.hostOnlyStart': 'solo el anfitrión puede empezar',
  'error.noSuchSeat': 'ese sitio no existe',
  'error.cannotRemovePlayer': 'no se puede quitar a un jugador',
  'error.unknownToken': 'ningún sitio de aquí corresponde a ese token',
  'error.needTwoPlayers': 'hacen falta al menos dos jugadores',
  'error.notStarted': 'la partida no ha empezado',
  'error.clientClock': 'los clientes no controlan el reloj',
  'error.connection': 'problema de conexión',
} as const satisfies Catalogue;
