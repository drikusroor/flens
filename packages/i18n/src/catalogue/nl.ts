/**
 * Dutch — the language the game is actually played in.
 *
 * Flens is a Groninger game, so the terms of art are already Dutch and stay put
 * everywhere: flensstok, voorraad, Pankouk, and FLENS! itself.
 */

import type { Catalogue } from './types.js';

export const nl = {
  'app.name': 'Flens',
  'language.label': 'Taal',
  'language.en': 'English',
  'language.nl': 'Nederlands',
  'language.es': 'Español',

  'setup.blurb.origin':
    'Een Gronings familiekaartspel, ook bekend als Flintjen, Pankouk, Pang of Perry’s spel.',
  'setup.blurb.goal':
    'Race om je *flensstok* leeg te spelen door in het midden 1–{top} op te bouwen.',
  'setup.blurb.warning': 'Speel buiten de reeks en iemand roept *FLENS!*',
  'setup.opponents': 'Tegenstanders',
  'setup.difficulty': 'Moeilijkheid',
  'setup.difficulty.easy': 'Makkelijk — slordig, ziet het laat',
  'setup.difficulty.normal': 'Normaal',
  'setup.difficulty.hard': 'Moeilijk — maakt bijna geen fouten, slaat snel toe',
  'setup.buildUpTo': 'Opbouwen tot',
  'setup.topValue.16': '16 (Perry’s origineel)',
  'setup.topValue.15': '15 (de Pang-beschrijvingen)',
  'setup.hints': 'Laat me de fouten zien',
  'setup.hints.help':
    'Laat een aftelbalk zien zodra iemand een fout maakt. Handig om de regels te leren — maar ze zelf opmerken is juist het spel.',
  'setup.playBots': 'Speel tegen bots',
  'setup.playOnline': 'Online spelen met vrienden',
  'setup.learn': 'Leer spelen — negen handen, ongeveer vijf minuten',

  'table.supply': 'Opbouwen 1–{top} · {count} in de voorraad',
  'table.clock': '{seconds}s',
  'table.mute': 'Geluid uit',
  'table.unmute': 'Geluid aan',
  'table.soundOn': 'Geluid staat aan',
  'table.soundOff': 'Geluid staat uit',
  'table.newDeal': 'Opnieuw delen',
  'table.changeSetup': 'Instellingen wijzigen',
  'table.leave': 'Verlaten',

  'result.draw': 'Gelijkspel — niemand kon nog spelen',
  'result.youWin': 'Je wint!',
  'result.wins': '{name} wint',
  'result.playAgain': 'Nog een keer',

  'centre.title': 'Midden',
  'centre.done': 'klaar',
  'centre.needs': 'wil {value}',

  'seat.flensstok': 'flensstok {count}',
  'card.stok': 'stok',
  'card.hand': 'hand',

  'you.title': 'Jij',
  'you.yourTurn': 'jouw zet',
  'you.waiting': 'wachten…',
  'you.flensstok': 'Flensstok ({count})',
  'you.openPiles': 'Open stapels — klik op één om af te leggen',
  'you.hand': 'Hand',
  'you.pass': 'Niets te spelen — pas',

  'flens.call': 'FLENS!',
  'flens.hint':
    'Roep het als iemand buiten de reeks speelt, of een zet beëindigt terwijl er nog een zet mogelijk was. Verkeerd geroepen: twee kaarten op je eigen flensstok.',
  'flens.slipped': '{name} maakte een fout · {seconds}s',

  'log.title': 'Tafelpraat',

  'lobby.connecting': 'Verbinden…',
  'lobby.disconnected': 'Verbinding verbroken',
  'lobby.disconnected.body':
    'De verbinding met de server is weg. Draait hij? Probeer `npm run dev --workspace @flens/server` en herlaad de pagina.',
  'lobby.room': 'Kamer {code}',
  'lobby.share': 'Deel de code *{code}* met wie meespeelt.',
  'lobby.you': '(jij)',
  'lobby.host': 'host',
  'lobby.botTag': 'bot · {difficulty}',
  'lobby.ready': 'klaar',
  'lobby.away': 'weg',
  'lobby.remove': 'verwijderen',
  'lobby.addBot': '+ {difficulty} bot',
  'lobby.start': 'Start het spel',
  'lobby.needTwo': 'Minstens twee spelers nodig',
  'lobby.waitingHost': 'Wachten tot de host begint…',
  'lobby.title': 'Online spelen',
  'lobby.yourName': 'Jouw naam',
  'lobby.buildUpTo': 'Opbouwen tot',
  'lobby.create': 'Maak een kamer',
  'lobby.or': 'of',
  'lobby.roomCode': 'Kamercode',
  'lobby.join': 'Meedoen',
  'lobby.back': 'Terug',
  'lobby.leave': 'Verlaten',
  'lobby.hostName': 'Host',
  'lobby.playerName': 'Speler',

  'difficulty.easy': 'makkelijk',
  'difficulty.normal': 'normaal',
  'difficulty.hard': 'moeilijk',

  'discord.signInFailed':
    'De Activity kon het inloggen bij Discord niet afronden. Controleer of de client-id bij de applicatie hoort en of de server zijn client secret heeft.',
  'discord.connecting': 'Verbinden met Discord…',
  'discord.sameTable':
    'Iedereen die deze Activity opent, komt aan dezelfde tafel. Wachten op de start…',

  'tutorial.progress': '{index} / {count}',
  'tutorial.watching': 'Ik kijk mee →',
  'tutorial.finish': 'Afronden →',
  'tutorial.next': 'Verder →',
  'tutorial.reset': 'Opnieuw',
  'tutorial.skip': 'Deze overslaan',
  'tutorial.leave': 'Verlaten',
  'tutorial.bug': 'Dit had moeten werken — sla deze over en vertel wat je aanklikte.',
  'tutorial.windowClosed': 'Weg — het venster is zes seconden breed. Nog een keer.',
  'tutorial.wrongCall':
    'Niets om te roepen — een verkeerde FLENS! kost je twee kaarten op je eigen flensstok.',
  'tutorial.pileWants': 'Die stapel wacht op een {wants}. Zoek de stapel die een {value} wil.',
  'tutorial.runFinished': 'Die reeks is al af. Probeer een andere stapel.',
  'tutorial.graduated.title': 'Je kent het spel',
  'tutorial.graduated.body':
    'Drie dingen die de lessen hebben overgeslagen, omdat ze pas in een echt spel bijten:',
  'tutorial.graduated.clock':
    'Een zet duurt *45 seconden*. Loopt de tijd af, dan legt de tafel voor je af — en had je nog een zet, dan is dat net zo goed een overtreding.',
  'tutorial.graduated.stands':
    'Een fout die niemand ziet *blijft staan*. De verkeerde kaart blijft liggen en de reeks gaat daarvandaan verder. Daarom kijkt iedereen mee.',
  'tutorial.graduated.silent':
    'Niets markeert een overtreding. Geen balk, geen kleur, geen geluid — het aftellen dat je in les 6 zag, bestaat alleen hier en in de instelling “laat me de fouten zien”.',
  'tutorial.graduated.play': 'Speel tegen bots',
  'tutorial.graduated.menu': 'Terug naar het menu',

  'lesson.centre.title': 'Het midden begint bij één',
  'lesson.centre.body':
    'Vier stapels in het midden van de tafel. Elke stapel begint bij 1 en loopt op tot 16, en iedere speler mag op iedere stapel bijleggen. Dat is de hele motor van het spel.',
  'lesson.centre.task': 'Pak je 1 en leg hem op een lege middenstapel.',
  'lesson.centre.done': 'Die stapel wil nu een 2 — van wie dan ook, op elke zet.',
  'lesson.centre.nudge':
    'De middenstapels zijn allemaal leeg, en op een lege stapel past alleen een 1.',

  'lesson.flensstok.title': 'Je flensstok is de race',
  'lesson.flensstok.body':
    'De stapel links is je flensstok — tien kaarten dicht, alleen de bovenste zichtbaar. Speel hem leeg en je wint. Al het andere op tafel is enkel een manier om erbij te komen, en daarom speel je eruit zodra het kan.',
  'lesson.flensstok.task': 'Het midden wil een 5, en er ligt een 5 op je flensstok. Speel hem.',
  'lesson.flensstok.done':
    'Nog negen. Elke kaart die van die stapel gaat, maakt het spel korter.',
  'lesson.flensstok.nudge': 'Niets in je hand past. Kijk naar de bovenkant van je flensstok.',

  'lesson.priority.title': 'De flensstok gaat voor',
  'lesson.priority.body':
    'Je hebt een 7 in je hand en er ligt een 7 op je flensstok. Voor het midden zijn dat dezelfde kaart — dus zegt de regel dat die van de flensstok moet. Anders kon je eeuwig op je stapel blijven zitten en nooit verliezen.',
  'lesson.priority.task': 'Speel de 7 — van de juiste plek.',
  'lesson.priority.done': 'Precies. De 7 uit je hand blijft; de 7 van de flensstok kon niet wachten.',
  'lesson.priority.nudge':
    'Het zijn allebei zevens, en dat is nu juist de val. Die uit je hand spelen terwijl dezelfde waarde op je flensstok ligt, is een overtreding — de flensstok negeren — en daar mag op geroepen worden.',

  'lesson.discard.title': 'Je zet beëindigen',
  'lesson.discard.body':
    'Niets van wat je hebt past ergens. Kun je niet spelen, dan beëindig je je zet door één kaart uit je hand op één van je vier open stapels te leggen. Die stapels liggen open en je mag er later bovenaf spelen — dus waar je een kaart legt, doet ertoe.',
  'lesson.discard.task': 'Leg een kaart af op een open stapel.',
  'lesson.discard.done':
    'Zet voorbij. Begraaf een kaart verkeerd en je bent hem de rest van het spel aan het opgraven.',
  'lesson.discard.nudge': 'Hier komt niets bij het midden. De enige uitweg uit deze zet is afleggen.',

  'lesson.voorrang.title': 'Kun je spelen, dan moet je',
  'lesson.voorrang.body':
    'Dit is de regel waar het hele spel aan hangt. Je zet beëindigen terwijl er nog een geldige zet naar het midden mogelijk was, is een overtreding — en het is de roep die je aan een echte tafel het vaakst hoort, omdat je hem het makkelijkst maakt zonder het te merken.',
  'lesson.voorrang.task': 'Je 6 past op de eerste stapel. Speel hem in plaats van af te leggen.',
  'lesson.voorrang.done':
    'Goed. Vergelijk het midden met alles wat je kunt bereiken voordat je een zet beëindigt.',
  'lesson.voorrang.nudge':
    'Iets wat je vasthoudt komt wél bij het midden. Zoek het voordat je je zet beëindigt.',
  'lesson.voorrang.mistake':
    'En daar is het. Je beëindigde je zet terwijl er nog een zet mogelijk was, {opponent} riep het, en hun open stapel ligt nu onder de jouwe om door te ploegen. Opnieuw — speel nu de 6.',

  'lesson.spot.title': 'Iemand moet het roepen',
  'lesson.spot.body':
    'Niets in dit spel houdt een verkeerde kaart tegen. De engine laat een 9 vrolijk op een stapel landen die op een 3 wacht — en hij blijft liggen en telt mee, tenzij een andere speler binnen zes seconden FLENS! roept. De balk hieronder is een zijwieltje; in een echt spel is er geen balk.',
  'lesson.spot.task': 'Let op {opponent}. Zodra ze buiten de reeks spelen, sla je op FLENS!',
  'lesson.spot.done':
    'Gepakt. Hun kaart gaat van de stapel af, en jouw kleinste open stapel gaat naar hen.',
  'lesson.spot.nudge':
    'Nog niets om te roepen — en verkeerd roepen kost je twee kaarten op je eigen flensstok.',

  'lesson.watch.title': 'Nu zonder de balk',
  'lesson.watch.body':
    'Dat aftellen is weg, en deze fout is stiller: {opponent} staat op het punt hun zet te beëindigen met een 6 boven op hun flensstok, terwijl de eerste middenstapel om een 6 vraagt. Vergelijken wat mensen kunnen bereiken met wat het midden wil — dat is de echte vaardigheid van Flens.',
  'lesson.watch.task': 'Als {opponent} hun zet beëindigt zonder die 6 te spelen, roep het dan.',
  'lesson.watch.done':
    'Dat is de roep waarmee je spellen wint. Alles wat je nodig had lag open: de bovenkant van hun flensstok en waar de stapel om vroeg.',
  'lesson.watch.nudge':
    'Nog niet. Ze hebben hun zet nog niet beëindigd — tot dat gebeurt, hebben ze niets verkeerd gedaan.',

  'lesson.pankouk.title': 'Pankouk!',
  'lesson.pankouk.body':
    'Maak een stapel af op 16 en de hele reeks wordt opgeruimd en terug in de voorraad geschud, en daardoor raakt het spel niet zonder kaarten. Traditioneel roept wie de 16 legt: Pankouk — pannenkoek. De helft van de namen van dit spel is eten.',
  'lesson.pankouk.task': 'Leg je 16 op de stapel die bijna af is.',
  'lesson.pankouk.done':
    'Zestien kaarten terug in omloop, en een vrije stapel waar iemand bij 1 kan beginnen.',
  'lesson.pankouk.nudge': 'Eén stapel is nog één kaart van compleet. Kijk waar hij om vraagt.',

  'lesson.win.title': 'Flens!',
  'lesson.win.body':
    'Nog één kaart op je flensstok, en het midden vraagt precies daarom. Speel de stapel leeg en het spel is op dat moment voorbij — je hand en je open stapels hoeven niet leeg.',
  'lesson.win.task': 'Speel je laatste flensstokkaart en win.',
  'lesson.win.done': 'Flens. Dat is het spel.',
  'lesson.win.nudge': 'Het midden wil een 7, en er is nog maar één plek om er een te halen.',

  // De naam van een stoel is een label, geen woord in de zin: één ervan is
  // "Jij". Daarom staat een naam nooit na een voorzetsel ("op Jij") en hoort er
  // nooit een bezittelijk voornaamwoord bij.
  'log.start': 'Spel begonnen met {count} spelers',
  'log.play': '{name} speelde {value} op middenstapel {pile}',
  'log.discard': '{name} legde {value} af op open stapel {pile}',
  'log.falseCall': {
    one: '{name} riep FLENS! zonder reden en nam {count} kaart',
    other: '{name} riep FLENS! zonder reden en nam {count} kaarten',
  },
  'log.flens': 'FLENS! {caller} → {offender} ({detail})',
  'log.flensCards': {
    one: 'FLENS! {caller} → {offender} ({detail}): {count} kaart over',
    other: 'FLENS! {caller} → {offender} ({detail}): {count} kaarten over',
  },
  'log.pass': '{name} kon niet spelen en paste',
  'log.drawNoMoves': 'niemand kan nog spelen — het spel is gelijk',
  'log.drawIdle': {
    one: 'geen zet naar het midden in {count} zet — het spel is gelijk',
    other: 'geen zet naar het midden in {count} zetten — het spel is gelijk',
  },
  'log.timeoutPlay': '{name} had geen tijd meer; de tafel speelde {value}',
  'log.timeoutPass': '{name} had geen tijd meer en paste',
  'log.timeoutDiscard': '{name} had geen tijd meer en legde {value} af',
  'log.infraction': '{name}: overtreding, {detail}',
  'log.gotAway': '{name} kwam ermee weg',
  'log.reverted': 'onopgemerkte fout teruggedraaid ({detail})',
  'log.pankouk': 'middenstapel {pile} is af — Pankouk!',
  'log.reshuffled': 'afgemaakte reeksen terug in de voorraad geschud',
  'log.recycled': {
    one: '{count} begraven kaart terug in de voorraad',
    other: '{count} begraven kaarten terug in de voorraad',
  },
  'log.win': '{name} won',

  'infraction.outOfSequence': 'speelde {value} op een stapel die {expected} verwachtte',
  'infraction.ignoredFlensstok':
    'speelde {value} uit de hand terwijl dezelfde waarde boven op de flensstok lag',
  'infraction.missedCentrePlay':
    'beëindigde de zet terwijl er nog een geldige zet naar het midden was',

  'reject.gameOver': 'het spel is voorbij',
  'reject.notYourTurn': 'niet jouw zet',
  'reject.noSuchPlayer': 'die speler bestaat niet',
  'reject.noCardThere': 'daar ligt geen kaart',
  'reject.noSuchCentrePile': 'die middenstapel bestaat niet',
  'reject.noCardInHand': 'geen kaart op die plek in je hand',
  'reject.noSuchOpenPile': 'die open stapel bestaat niet',
  'reject.mustPlayOrDiscard': 'je moet spelen of afleggen, niet passen',
  'reject.mustPlay': 'je hebt een geldige zet en moet die doen',
  'reject.backwardsTick': 'de klok kan niet terug',

  'error.malformedMessage': 'onleesbaar bericht',
  'error.unrecognisedMessage': 'onbekend bericht',
  'error.noRoomWithCode': 'geen kamer met die code',
  'error.noSeatHere': 'je hebt hier geen plek',
  'error.notInRoom': 'je zit niet in een kamer',
  'error.alreadyStarted': 'dat spel is al begonnen',
  'error.roomFull': 'die kamer is vol',
  'error.hostOnly': 'alleen de host kan dat',
  'error.hostOnlyStart': 'alleen de host kan starten',
  'error.noSuchSeat': 'die plek bestaat niet',
  'error.cannotRemovePlayer': 'een speler kun je niet verwijderen',
  'error.unknownToken': 'geen plek hier hoort bij dat token',
  'error.needTwoPlayers': 'minstens twee spelers nodig',
  'error.notStarted': 'het spel is nog niet begonnen',
  'error.clientClock': 'clients bepalen de klok niet',
  'error.connection': 'verbindingsprobleem',
} as const satisfies Catalogue;
