/**
 * English — the source catalogue.
 *
 * Every other language is typed against this one, so a key added here is a
 * compile error everywhere until it is translated. Two bits of inline markup are
 * understood by the renderer in `format.ts`: `*emphasis*` and `` `code` ``.
 * Anything in braces is a parameter; a line with a `{count}` parameter may be
 * written as a `one` / `other` pair instead of a single string.
 */

import type { Entry } from '../entry.js';

export const en = {
  // -------------------------------------------------------------------------
  // Chrome
  // -------------------------------------------------------------------------

  'app.name': 'Flens',
  'language.label': 'Language',
  // Language names stay in their own language in every catalogue: someone
  // looking for their language recognises the endonym, not the translation.
  'language.en': 'English',
  'language.nl': 'Nederlands',
  'language.es': 'Español',

  // -------------------------------------------------------------------------
  // Setup screen
  // -------------------------------------------------------------------------

  'setup.blurb.origin':
    'A Groninger family card game, also known as Flintjen, Pankouk, Pang or Perry’s spel.',
  'setup.blurb.goal': 'Race to empty your *flensstok* by building 1–{top} in the centre.',
  'setup.blurb.warning': 'Play out of sequence and someone will shout *FLENS!*',
  'setup.opponents': 'Opponents',
  'setup.difficulty': 'Difficulty',
  'setup.difficulty.easy': 'Easy — sloppy, slow to notice',
  'setup.difficulty.normal': 'Normal',
  'setup.difficulty.hard': 'Hard — rarely errs, pounces fast',
  'setup.buildUpTo': 'Build up to',
  'setup.topValue.16': '16 (Perry’s original)',
  'setup.topValue.15': '15 (the Pang write-ups)',
  'setup.hints': 'Show me the mistakes',
  'setup.hints.help':
    'Reveals a countdown whenever someone errs. Good for learning the rules — but spotting them yourself is the actual game.',
  'setup.playBots': 'Play against bots',
  'setup.playOnline': 'Play online with friends',
  'setup.learn': 'Learn to play — nine hands, about five minutes',

  // -------------------------------------------------------------------------
  // The table
  // -------------------------------------------------------------------------

  'table.supply': 'Building 1–{top} · {count} in the supply',
  'table.clock': '{seconds}s',
  'table.mute': 'Mute',
  'table.unmute': 'Unmute',
  'table.soundOn': 'Sound on',
  'table.soundOff': 'Sound off',
  'table.newDeal': 'New deal',
  'table.changeSetup': 'Change setup',
  'table.leave': 'Leave',

  'result.draw': 'Draw — nobody could move',
  'result.youWin': 'You win!',
  'result.wins': '{name} wins',
  'result.playAgain': 'Play again',

  'centre.title': 'Centre',
  'centre.done': 'done',
  'centre.needs': 'needs {value}',

  'seat.flensstok': 'flensstok {count}',
  'card.stok': 'stok',
  'card.hand': 'hand',

  'you.title': 'You',
  'you.yourTurn': 'your turn',
  'you.waiting': 'waiting…',
  'you.flensstok': 'Flensstok ({count})',
  'you.openPiles': 'Open piles — click one to discard',
  'you.hand': 'Hand',
  'you.pass': 'Nothing to play — pass',

  'flens.call': 'FLENS!',
  'flens.hint':
    'Call it when someone plays out of sequence, or ends a turn with a play still available. Wrong call: two cards onto your own flensstok.',
  'flens.slipped': '{name} slipped up · {seconds}s',

  'log.title': 'Table talk',

  // -------------------------------------------------------------------------
  // Online lobby
  // -------------------------------------------------------------------------

  'lobby.connecting': 'Connecting…',
  'lobby.disconnected': 'Disconnected',
  'lobby.disconnected.body':
    'Lost the connection to the server. Is it running? Try `npm run dev --workspace @flens/server`, then reload.',
  'lobby.room': 'Room {code}',
  'lobby.share': 'Share the code *{code}* with whoever is playing.',
  'lobby.you': '(you)',
  'lobby.host': 'host',
  'lobby.botTag': 'bot · {difficulty}',
  'lobby.ready': 'ready',
  'lobby.away': 'away',
  'lobby.remove': 'remove',
  'lobby.addBot': '+ {difficulty} bot',
  'lobby.start': 'Start the game',
  'lobby.needTwo': 'Need at least two players',
  'lobby.waitingHost': 'Waiting for the host to start…',
  'lobby.title': 'Play online',
  'lobby.yourName': 'Your name',
  'lobby.buildUpTo': 'Build up to',
  'lobby.create': 'Create a room',
  'lobby.or': 'or',
  'lobby.roomCode': 'Room code',
  'lobby.join': 'Join',
  'lobby.back': 'Back',
  'lobby.leave': 'Leave',
  /** Stand-in names for a player who left the field blank. */
  'lobby.hostName': 'Host',
  'lobby.playerName': 'Player',

  'difficulty.easy': 'easy',
  'difficulty.normal': 'normal',
  'difficulty.hard': 'hard',

  // -------------------------------------------------------------------------
  // Discord Activity
  // -------------------------------------------------------------------------

  'discord.signInFailed':
    'The Activity could not finish signing in with Discord. Check that the client id matches the application and that the server has its client secret.',
  'discord.connecting': 'Connecting to Discord…',
  'discord.sameTable': 'Everyone who opens this Activity joins the same table. Waiting to start…',

  // -------------------------------------------------------------------------
  // Tutorial chrome
  // -------------------------------------------------------------------------

  'tutorial.progress': '{index} / {count}',
  'tutorial.watching': 'I’m watching →',
  'tutorial.finish': 'Finish →',
  'tutorial.next': 'Next →',
  'tutorial.reset': 'Reset',
  'tutorial.skip': 'Skip this one',
  'tutorial.leave': 'Leave',
  'tutorial.bug': 'That should have worked — skip on, and mention what you clicked.',
  'tutorial.windowClosed': 'Gone — the window is six seconds wide. Once more.',
  'tutorial.wrongCall':
    'Nothing to call — a wrong FLENS! costs you two cards onto your own flensstok.',
  'tutorial.pileWants': 'That pile is waiting for a {wants}. Find the one that wants a {value}.',
  'tutorial.runFinished': 'That run is already finished. Try another pile.',
  'tutorial.graduated.title': 'You know the game',
  'tutorial.graduated.body':
    'Three things the lessons left out, because they only bite in a real game:',
  'tutorial.graduated.clock':
    'A turn lasts *45 seconds*. Run out and the table discards for you — and if you had a play available, that is an infraction like any other.',
  'tutorial.graduated.stands':
    'A mistake nobody catches *stands*. The wrong card stays on the pile and the run carries on from it. That is why anyone watches at all.',
  'tutorial.graduated.silent':
    'Nothing marks an infraction. No bar, no highlight, no sound — the countdown you saw in lesson 6 exists only here and in the “show me the mistakes” setting.',
  'tutorial.graduated.play': 'Play against bots',
  'tutorial.graduated.menu': 'Back to the menu',

  // -------------------------------------------------------------------------
  // The nine lessons
  // -------------------------------------------------------------------------

  'lesson.centre.title': 'The centre starts at one',
  'lesson.centre.body':
    'Four piles in the middle of the table. Every one of them starts at 1 and builds up to 16, and any player may add to any pile. That is the whole engine of the game.',
  'lesson.centre.task': 'Pick up your 1 and put it on an empty centre pile.',
  'lesson.centre.done': 'That pile wants a 2 now — from anybody, on any turn.',
  'lesson.centre.nudge': 'The centre piles are all empty, and an empty pile only accepts a 1.',

  'lesson.flensstok.title': 'Your flensstok is the race',
  'lesson.flensstok.body':
    'The stack on the left is your flensstok — ten cards face down, only the top one showing. Empty it and you win. Everything else on the table is just a way of getting at it, which is why you play from it whenever you can.',
  'lesson.flensstok.task': 'The centre wants a 5, and a 5 is sitting on your flensstok. Play it.',
  'lesson.flensstok.done':
    'Nine to go. Every card you shift off that stack is the game getting shorter.',
  'lesson.flensstok.nudge': 'Nothing in your hand fits. Look at the top of your flensstok.',

  'lesson.priority.title': 'The flensstok goes first',
  'lesson.priority.body':
    'You are holding a 7, and there is a 7 on your flensstok. They are the same card as far as the centre is concerned — so the rule says the flensstok one has to go. Otherwise you could sit on your stack forever and never lose.',
  'lesson.priority.task': 'Play the 7 — from the right place.',
  'lesson.priority.done': 'Correct. The hand 7 keeps; the flensstok 7 could not wait.',
  'lesson.priority.nudge':
    'Both are 7s, and that is exactly the trap. Playing the one from your hand while the same value sits on your flensstok is an infraction — ignoring the flensstok — and it is callable.',

  'lesson.discard.title': 'Ending your turn',
  'lesson.discard.body':
    'Nothing you hold fits anywhere. When you cannot play, you end your turn by putting one card from your hand onto one of your four open piles. Those piles are face up and you may play off the top of them later — so where you put a card matters.',
  'lesson.discard.task': 'Discard a card onto an open pile.',
  'lesson.discard.done':
    'Turn over. Bury a card badly and you will be digging it out for the rest of the game.',
  'lesson.discard.nudge':
    'Nothing here reaches the centre. The only way out of this turn is a discard.',

  'lesson.voorrang.title': 'If you can play, you must',
  'lesson.voorrang.body':
    'This is the rule the whole game hangs on. Ending your turn while a legal centre play was still available is an infraction — and it is the call you will hear most often at a real table, because it is the easiest one to commit without noticing.',
  'lesson.voorrang.task': 'Your 6 fits the first pile. Play it instead of discarding.',
  'lesson.voorrang.done':
    'Right. Check the centre against everything you can reach before you end a turn.',
  'lesson.voorrang.nudge':
    'Something you are holding does reach the centre. Find it before you end the turn.',
  'lesson.voorrang.mistake':
    'And there it is. You ended your turn with a play available, {opponent} called it, and their open pile is now buried under yours for you to dig through. Again — this time play the 6.',

  'lesson.spot.title': 'Somebody has to call it',
  'lesson.spot.body':
    'Nothing in this game stops a wrong card going down. The engine will happily let a 9 land on a pile waiting for a 3 — and it stays there, counting, unless another player shouts FLENS! within six seconds. The bar below is training wheels; there is no bar in a real game.',
  'lesson.spot.task': 'Watch {opponent}. The instant they play out of sequence, hit FLENS!',
  'lesson.spot.done':
    'Got them. Their card comes off the pile, and your smallest open pile goes to them.',
  'lesson.spot.nudge':
    'Nothing to call yet — and calling wrongly costs you two cards onto your own flensstok.',

  'lesson.watch.title': 'Now without the bar',
  'lesson.watch.body':
    'That countdown is gone, and this mistake is quieter: {opponent} is about to end their turn with a 6 on top of their flensstok while the first centre pile is asking for a 6. Comparing what people can reach against what the centre wants — that is the actual skill of Flens.',
  'lesson.watch.task': 'If {opponent} ends their turn without playing that 6, call it.',
  'lesson.watch.done':
    'That is the call that wins games. Everything you need was face up: their flensstok top and what the pile was asking for.',
  'lesson.watch.nudge':
    'Not yet. They have not ended their turn — until they do, they have done nothing wrong.',

  'lesson.pankouk.title': 'Pankouk!',
  'lesson.pankouk.body':
    'Finish a pile at 16 and the whole run is swept up and shuffled back into the supply, which is what keeps the game from running out of cards. Traditionally the person who lands the 16 shouts Pankouk — pancake. Half the names this game goes by are food.',
  'lesson.pankouk.task': 'Put your 16 on the finished pile.',
  'lesson.pankouk.done':
    'Sixteen cards back into circulation, and a free pile for somebody to start at 1.',
  'lesson.pankouk.nudge': 'One pile is one card short of complete. Look at what it is asking for.',

  'lesson.win.title': 'Flens!',
  'lesson.win.body':
    'One card left on your flensstok, and the centre is asking for exactly it. Empty the stack and the game is over on the spot — no need to clear your hand or your open piles.',
  'lesson.win.task': 'Play your last flensstok card and win.',
  'lesson.win.done': 'Flens. That is the game.',
  'lesson.win.nudge': 'The centre wants a 7, and there is only one place left to get one.',

  // -------------------------------------------------------------------------
  // Table talk — produced by the engine
  //
  // `{name}` is a seat name, and one of the seats is the person reading, called
  // "You" / "Jij" / "Tú". So every line has to agree with a second person as
  // well as a third: English and Dutch do that by reporting in the past tense,
  // Spanish by naming the move rather than conjugating it.
  // -------------------------------------------------------------------------

  'log.start': 'Game started with {count} players',
  'log.play': '{name} played {value} to centre pile {pile}',
  'log.discard': '{name} discarded {value} to open pile {pile}',
  'log.falseCall': {
    one: '{name} called FLENS! wrongly and took {count} card',
    other: '{name} called FLENS! wrongly and took {count} cards',
  },
  'log.flens': '{caller} called FLENS! on {offender} ({detail})',
  'log.flensCards': {
    one: '{caller} called FLENS! on {offender} ({detail}) and handed over {count} card',
    other: '{caller} called FLENS! on {offender} ({detail}) and handed over {count} cards',
  },
  'log.pass': '{name} could not move and passed',
  'log.drawNoMoves': 'nobody can move — the game is a draw',
  'log.drawIdle': {
    one: 'no centre play in {count} turn — the game is a draw',
    other: 'no centre play in {count} turns — the game is a draw',
  },
  'log.timeoutPlay': '{name} ran out of time; the table played {value} instead',
  'log.timeoutPass': '{name} ran out of time and passed',
  'log.timeoutDiscard': '{name} ran out of time and discarded {value}',
  'log.infraction': 'infraction by {name}: {detail}',
  'log.gotAway': '{name} got away with it',
  'log.reverted': 'uncaught error reverted ({detail})',
  'log.pankouk': 'centre pile {pile} completed — Pankouk!',
  'log.reshuffled': 'reshuffled completed runs back into the supply',
  'log.recycled': {
    one: 'recycled {count} buried card back into the supply',
    other: 'recycled {count} buried cards back into the supply',
  },
  'log.win': '{name} won',

  // -------------------------------------------------------------------------
  // What an infraction was. Reads as a clause inside the lines above.
  // -------------------------------------------------------------------------

  'infraction.outOfSequence': 'played {value} onto a pile expecting {expected}',
  'infraction.ignoredFlensstok':
    'played {value} from hand while the same value sat on top of the flensstok',
  'infraction.missedCentrePlay': 'ended the turn while a legal centre play was available',

  // -------------------------------------------------------------------------
  // Actions the engine refuses outright — impossible, not merely unwise.
  // -------------------------------------------------------------------------

  'reject.gameOver': 'the game is over',
  'reject.notYourTurn': 'not your turn',
  'reject.noSuchPlayer': 'no such player',
  'reject.noCardThere': 'no card at that source',
  'reject.noSuchCentrePile': 'no such centre pile',
  'reject.noCardInHand': 'no card at that hand index',
  'reject.noSuchOpenPile': 'no such open pile',
  'reject.mustPlayOrDiscard': 'you must play or discard, not pass',
  'reject.mustPlay': 'you have a legal play and must make it',
  'reject.backwardsTick': 'cannot tick backwards',

  // -------------------------------------------------------------------------
  // Server refusals
  // -------------------------------------------------------------------------

  'error.malformedMessage': 'malformed message',
  'error.unrecognisedMessage': 'unrecognised message',
  'error.noRoomWithCode': 'no room with that code',
  'error.noSeatHere': 'you do not hold a seat here',
  'error.notInRoom': 'you are not in a room',
  'error.alreadyStarted': 'that game has already started',
  'error.roomFull': 'that room is full',
  'error.hostOnly': 'only the host can do that',
  'error.hostOnlyStart': 'only the host can start',
  'error.noSuchSeat': 'no such seat',
  'error.cannotRemovePlayer': 'cannot remove a player',
  'error.unknownToken': 'no seat here matches that token',
  'error.needTwoPlayers': 'need at least two players',
  'error.notStarted': 'the game has not started',
  'error.clientClock': 'clients do not control the clock',
  'error.connection': 'connection problem',
} as const satisfies Record<string, Entry>;
