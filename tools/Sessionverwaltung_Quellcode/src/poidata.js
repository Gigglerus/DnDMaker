/* DND5e Sessionverwaltung – Points of Interest: Daten, Preise, Generator (in Node testbar) */
(function (W) {
'use strict';
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const L = (p, lang) => Array.isArray(p) ? (lang === 'en' ? (p[1] != null ? p[1] : p[0]) : p[0]) : p;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* Einheiten */
const U = { pc: ['Stück', 'each'], mug: ['Krug', 'mug'], night: ['Nacht', 'night'], meal: ['Mahlzeit', 'meal'], day: ['Tag', 'day'], lb: ['Pfund', 'lb'], mile: ['Meile', 'mile'], svc: ['Leistung', 'service'], bottle: ['Flasche', 'bottle'], yd: ['Elle', 'yard'], set: ['Satz', 'set'], vial: ['Phiole', 'vial'], hr: ['Stunde', 'hour'], find: ['Fund', 'find'], seat: ['Platz', 'seat'], pitcher: ['Kanne', 'pitcher'], loaf: ['Laib', 'loaf'], week: ['Woche', 'week'] };

/* Katalog: Schlüssel → [DE, EN, Grundpreis in KM (bürgerlich, PHB-orientiert), Einheit] */
const C = {
  ale: ['Bier', 'Ale', 4, 'mug'], wine: ['Landwein', 'Common wine', 20, 'pitcher'], finewine: ['Edler Wein', 'Fine wine', 1000, 'bottle'], mead: ['Met', 'Mead', 6, 'mug'], spirits: ['Schnaps', 'Spirits', 8, 'mug'], cider: ['Apfelwein', 'Cider', 4, 'mug'],
  stew: ['Eintopf mit Brot', 'Stew with bread', 6, 'meal'], meal: ['Warme Mahlzeit', 'Hot meal', 30, 'meal'], roast: ['Braten mit Beilagen', 'Roast with sides', 60, 'meal'], feast: ['Festmahl', 'Feast', 200, 'meal'], bread: ['Brot', 'Bread', 2, 'loaf'], cheese: ['Käse', 'Cheese', 10, 'pc'], meat: ['Fleisch', 'Meat', 30, 'lb'],
  bunk: ['Schlafplatz im Gemeinschaftsraum', 'Bunk in the common room', 10, 'night'], room: ['Einzelzimmer', 'Private room', 50, 'night'], suite: ['Suite mit Bad', 'Suite with bath', 400, 'night'], stabling: ['Stellplatz für ein Pferd', 'Stabling', 50, 'night'], bath: ['Heißes Bad', 'Hot bath', 5, 'svc'], shave: ['Rasur & Haarschnitt', 'Shave & haircut', 3, 'svc'], massage: ['Massage', 'Massage', 50, 'svc'], tea: ['Tee', 'Tea', 3, 'pc'], pastry: ['Gebäck', 'Pastry', 4, 'pc'], dice: ['Würfelspiel (Einsatz)', 'Dice game (stake)', 100, 'svc'], cards: ['Kartenspiel', 'Playing cards', 50, 'set'],
  backpack: ['Rucksack', 'Backpack', 200, 'pc'], bedroll: ['Schlafsack', 'Bedroll', 100, 'pc'], blanket: ['Decke', 'Blanket', 50, 'pc'], candle: ['Kerze', 'Candle', 1, 'pc'], crowbar: ['Brechstange', 'Crowbar', 200, 'pc'], oil: ['Lampenöl', 'Flask of oil', 10, 'pc'], rope: ['Hanfseil (15 m)', 'Hempen rope (50 ft)', 100, 'pc'], silkrope: ['Seidenseil (15 m)', 'Silk rope (50 ft)', 1000, 'pc'], lantern: ['Blendlaterne', 'Hooded lantern', 500, 'pc'], torch: ['Fackel', 'Torch', 1, 'pc'], rations: ['Reiseproviant', 'Rations', 50, 'day'], tinder: ['Zunderkästchen', 'Tinderbox', 50, 'pc'], waterskin: ['Wasserschlauch', 'Waterskin', 20, 'pc'], grapple: ['Enterhaken', 'Grappling hook', 200, 'pc'], piton: ['Kletterhaken', 'Piton', 5, 'pc'], tent: ['Zelt (2 Personen)', 'Tent (two-person)', 200, 'pc'], chalk: ['Kreide', 'Chalk', 1, 'pc'], sack: ['Sack', 'Sack', 1, 'pc'], pouch: ['Gürtelbeutel', 'Pouch', 50, 'pc'], soap: ['Seife', 'Soap', 2, 'pc'], mirror: ['Stahlspiegel', 'Steel mirror', 500, 'pc'], caltrops: ['Krähenfüße (Beutel)', 'Caltrops (bag)', 100, 'pc'], ballbear: ['Murmeln (Beutel)', 'Ball bearings (bag)', 100, 'pc'], manacles: ['Handschellen', 'Manacles', 200, 'pc'], lock: ['Schloss', 'Lock', 1000, 'pc'], healkit: ['Heilerausrüstung', 'Healer\'s kit', 500, 'pc'], whetstone: ['Wetzstein', 'Whetstone', 1, 'pc'],
  dagger: ['Dolch', 'Dagger', 200, 'pc'], club: ['Knüppel', 'Club', 10, 'pc'], handaxe: ['Handbeil', 'Handaxe', 500, 'pc'], spear: ['Speer', 'Spear', 100, 'pc'], mace: ['Streitkolben', 'Mace', 500, 'pc'], shortsword: ['Kurzschwert', 'Shortsword', 1000, 'pc'], longsword: ['Langschwert', 'Longsword', 1500, 'pc'], rapier: ['Rapier', 'Rapier', 2500, 'pc'], greatsword: ['Zweihänder', 'Greatsword', 5000, 'pc'], battleaxe: ['Streitaxt', 'Battleaxe', 1000, 'pc'], warhammer: ['Kriegshammer', 'Warhammer', 1500, 'pc'], scimitar: ['Krummsäbel', 'Scimitar', 2500, 'pc'], halberd: ['Hellebarde', 'Halberd', 2000, 'pc'], shortbow: ['Kurzbogen', 'Shortbow', 2500, 'pc'], longbow: ['Langbogen', 'Longbow', 5000, 'pc'], lcrossbow: ['Leichte Armbrust', 'Light crossbow', 2500, 'pc'], hcrossbow: ['Schwere Armbrust', 'Heavy crossbow', 5000, 'pc'], arrows: ['Pfeile (20)', 'Arrows (20)', 100, 'set'], bolts: ['Bolzen (20)', 'Bolts (20)', 100, 'set'], javelin: ['Wurfspeer', 'Javelin', 50, 'pc'],
  padded: ['Gesteppte Rüstung', 'Padded armour', 500, 'pc'], leather: ['Lederrüstung', 'Leather armour', 1000, 'pc'], studded: ['Beschlagene Lederrüstung', 'Studded leather', 4500, 'pc'], hide: ['Fellrüstung', 'Hide armour', 1000, 'pc'], chainshirt: ['Kettenhemd', 'Chain shirt', 5000, 'pc'], scale: ['Schuppenpanzer', 'Scale mail', 5000, 'pc'], breastplate: ['Brustplatte', 'Breastplate', 40000, 'pc'], halfplate: ['Halbplatte', 'Half plate', 75000, 'pc'], chainmail: ['Kettenpanzer', 'Chain mail', 7500, 'pc'], splint: ['Schienenpanzer', 'Splint armour', 20000, 'pc'], plate: ['Ritterrüstung', 'Plate armour', 150000, 'pc'], shield: ['Schild', 'Shield', 1000, 'pc'],
  horseshoe: ['Hufbeschlag', 'Horseshoeing', 50, 'svc'], repair: ['Reparatur einer Waffe', 'Weapon repair', 100, 'svc'], armorfix: ['Rüstung ausbessern', 'Armour repair', 500, 'svc'], tools_smith: ['Schmiedewerkzeug', 'Smith\'s tools', 2000, 'set'], nails: ['Nägel (100)', 'Nails (100)', 10, 'set'], pot: ['Eisentopf', 'Iron pot', 200, 'pc'], sharpen: ['Klinge schärfen', 'Sharpen a blade', 5, 'svc'],
  acid: ['Säure', 'Acid', 2500, 'vial'], alchfire: ['Alchemistenfeuer', 'Alchemist\'s fire', 5000, 'vial'], antitoxin: ['Gegengift', 'Antitoxin', 5000, 'vial'], healpot: ['Heiltrank', 'Potion of healing', 5000, 'vial'], greaterheal: ['Großer Heiltrank', 'Potion of greater healing', 15000, 'vial'], poison: ['Einfaches Gift', 'Basic poison', 10000, 'vial'], holywater: ['Weihwasser', 'Holy water', 2500, 'vial'], alchsupp: ['Alchemistenausrüstung', 'Alchemist\'s supplies', 5000, 'set'], perfume: ['Parfüm', 'Perfume', 500, 'vial'], smokestick: ['Rauchkugel', 'Smoke bomb', 1000, 'pc'],
  herbs: ['Heilkräuter (Bund)', 'Healing herbs (bundle)', 10, 'pc'], herbkit: ['Kräuterkundeausrüstung', 'Herbalism kit', 500, 'set'], tea_herb: ['Kräutertee gegen Erkältung', 'Herbal tea for colds', 5, 'pc'], salve: ['Wundsalbe', 'Wound salve', 100, 'pc'], sleepdraught: ['Schlaftrunk', 'Sleeping draught', 200, 'vial'], spice: ['Gewürze (Zimt, Pfeffer)', 'Spices (cinnamon, pepper)', 200, 'lb'], mushroom: ['Seltene Pilze', 'Rare mushrooms', 300, 'pc'],
  focus_crystal: ['Arkaner Fokus (Kristall)', 'Arcane focus (crystal)', 1000, 'pc'], wand: ['Zauberstab (Fokus)', 'Wand (focus)', 1000, 'pc'], orb: ['Kugel (Fokus)', 'Orb (focus)', 2000, 'pc'], comppouch: ['Materialkomponentenbeutel', 'Component pouch', 2500, 'pc'], spellbook: ['Leeres Zauberbuch', 'Blank spellbook', 5000, 'pc'], scroll1: ['Zauberschriftrolle (1. Grad)', 'Spell scroll (1st level)', 7500, 'pc'], scroll2: ['Zauberschriftrolle (2. Grad)', 'Spell scroll (2nd level)', 20000, 'pc'], identify: ['Gegenstand identifizieren', 'Identify an item', 2000, 'svc'], pearl: ['Perle (für Identifizieren)', 'Pearl (for Identify)', 10000, 'pc'], ink: ['Tinte', 'Ink', 1000, 'bottle'], magicitem: ['Gewöhnlicher magischer Gegenstand', 'Common magic item', 10000, 'pc'],
  commonclothes: ['Einfache Kleidung', 'Common clothes', 50, 'set'], travelclothes: ['Reisekleidung', 'Traveller\'s clothes', 200, 'set'], fineclothes: ['Edle Kleidung', 'Fine clothes', 1500, 'set'], costume: ['Kostüm', 'Costume', 500, 'set'], robe: ['Robe', 'Robe', 100, 'pc'], cloak: ['Wollumhang', 'Wool cloak', 100, 'pc'], tailoring: ['Kleidung nach Maß', 'Tailoring to measure', 500, 'svc'], linen: ['Leinen', 'Linen', 50, 'yd'], silk: ['Seide', 'Silk', 1000, 'yd'], boots: ['Stiefel', 'Boots', 100, 'pc'],
  ring_silver: ['Silberring', 'Silver ring', 2500, 'pc'], necklace: ['Goldkette', 'Gold necklace', 25000, 'pc'], gem10: ['Kleiner Edelstein', 'Small gem', 1000, 'pc'], gem50: ['Mondstein', 'Moonstone', 5000, 'pc'], gem100: ['Bernstein', 'Amber', 10000, 'pc'], gem500: ['Schwarze Perle', 'Black pearl', 50000, 'pc'], appraise: ['Schätzung eines Schmuckstücks', 'Appraisal', 100, 'svc'], brooch: ['Brosche', 'Brooch', 5000, 'pc'],
  flour: ['Mehl', 'Flour', 2, 'lb'], cake: ['Honigkuchen', 'Honey cake', 5, 'pc'], pie: ['Fleischpastete', 'Meat pie', 4, 'pc'], sausage: ['Würste', 'Sausages', 5, 'lb'], ham: ['Räucherschinken', 'Smoked ham', 50, 'pc'], chicken: ['Huhn', 'Chicken', 2, 'pc'], salt: ['Salz', 'Salt', 5, 'lb'],
  book: ['Buch', 'Book', 2500, 'pc'], paper: ['Papier', 'Paper', 20, 'pc'], parchment: ['Pergament', 'Parchment', 10, 'pc'], pen: ['Schreibfeder', 'Ink pen', 2, 'pc'], letter: ['Brief schreiben lassen', 'Have a letter written', 20, 'svc'], copy: ['Abschrift', 'Copy of a document', 100, 'svc'], mapcase: ['Kartenrolle', 'Map case', 100, 'pc'], localmap: ['Karte der Umgebung', 'Map of the region', 1000, 'pc'], cartokit: ['Kartografenwerkzeug', 'Cartographer\'s tools', 1500, 'set'], research: ['Recherche (pro Tag)', 'Research (per day)', 200, 'day'],
  pawn_misc: ['Gebrauchter Ring', 'Second-hand ring', 500, 'pc'], pawn_sword: ['Gebrauchtes Schwert', 'Used sword', 800, 'pc'], pawn_lute: ['Laute (gebraucht)', 'Lute (used)', 2000, 'pc'], pawn_loan: ['Pfandkredit', 'Pawn loan', 1000, 'svc'], spyglass: ['Fernrohr', 'Spyglass', 100000, 'pc'], hourglass: ['Stundenglas', 'Hourglass', 2500, 'pc'],
  horse: ['Reitpferd', 'Riding horse', 7500, 'pc'], drafthorse: ['Zugpferd', 'Draft horse', 5000, 'pc'], pony: ['Pony', 'Pony', 3000, 'pc'], mule: ['Maultier', 'Mule', 800, 'pc'], warhorse: ['Schlachtross', 'Warhorse', 40000, 'pc'], saddle: ['Reitsattel', 'Riding saddle', 1000, 'pc'], saddlebags: ['Satteltaschen', 'Saddlebags', 400, 'pc'], feed: ['Futter', 'Feed', 5, 'day'], cart: ['Karren', 'Cart', 1500, 'pc'], wagon: ['Wagen', 'Wagon', 3500, 'pc'], rent_horse: ['Pferd mieten', 'Rent a horse', 200, 'day'],
  lute: ['Laute', 'Lute', 3500, 'pc'], flute: ['Flöte', 'Flute', 200, 'pc'], drum: ['Trommel', 'Drum', 600, 'pc'], lyre: ['Leier', 'Lyre', 3000, 'pc'], viol: ['Fidel', 'Viol', 3000, 'pc'], strings: ['Saiten', 'Strings', 20, 'set'],
  plank: ['Bretter', 'Planks', 5, 'pc'], chest: ['Truhe', 'Chest', 500, 'pc'], barrel: ['Fass', 'Barrel', 200, 'pc'], ladder: ['Leiter (3 m)', 'Ladder (10 ft)', 10, 'pc'], pole: ['Stange (3 m)', 'Pole (10 ft)', 5, 'pc'], tools_carp: ['Zimmermannswerkzeug', 'Carpenter\'s tools', 800, 'set'], furniture: ['Möbelstück nach Wunsch', 'Custom furniture', 1000, 'svc'],
  cure: ['Heilzauber (Wunden heilen)', 'Healing spell (Cure Wounds)', 1000, 'svc'], restore: ['Schwächere Genesung', 'Lesser Restoration', 4000, 'svc'], removecurse: ['Fluch brechen', 'Remove Curse', 9000, 'svc'], raise: ['Tote erwecken (+ Diamant 500 GM)', 'Raise Dead (+ 500 gp diamond)', 125000, 'svc'], blessing: ['Segen / Spende', 'Blessing / donation', 100, 'svc'], augury: ['Vorahnung (Weissagung)', 'Augury', 4000, 'svc'], burial: ['Bestattung', 'Burial', 500, 'svc'], holysym: ['Heiliges Symbol', 'Holy symbol', 500, 'pc'], prayer: ['Gebetskerze', 'Prayer candle', 2, 'pc'], wedding: ['Trauung', 'Wedding ceremony', 1000, 'svc'], tend: ['Wundversorgung', 'Wound care', 20, 'svc'], cure_dis: ['Krankheit behandeln', 'Treat a disease', 500, 'svc'], bed_sick: ['Krankenbett', 'Sickbed', 20, 'day'],
  permit: ['Genehmigung / Siegel', 'Permit / seal', 500, 'svc'], fine: ['Bußgeld (kleines Vergehen)', 'Fine (minor offence)', 1000, 'svc'], tax: ['Torzoll', 'Gate toll', 1, 'pc'], records: ['Einsicht ins Archiv', 'Access to the records', 200, 'svc'], bounty: ['Kopfgeld (Aushang)', 'Bounty (posted)', 5000, 'svc'], bail: ['Kaution', 'Bail', 5000, 'svc'], visit: ['Besuch eines Gefangenen', 'Visit a prisoner', 20, 'svc'],
  guildfee: ['Gildenbeitrag', 'Guild dues', 500, 'week'], contract: ['Vertrag aufsetzen', 'Draw up a contract', 300, 'svc'], loan: ['Darlehen (Zins pro Woche)', 'Loan (interest per week)', 1000, 'week'], exchange: ['Geldwechsel (Gebühr)', 'Money changing (fee)', 10, 'svc'], deposit: ['Verwahrung im Tresor', 'Vault deposit', 100, 'week'], letterofcredit: ['Kreditbrief', 'Letter of credit', 500, 'svc'],
  arena_seat: ['Platz auf der Tribüne', 'Seat in the stands', 5, 'seat'], arena_vip: ['Loge', 'Private box', 500, 'seat'], bet: ['Wette (Mindesteinsatz)', 'Bet (minimum stake)', 100, 'svc'], fight: ['Teilnahme am Turnier', 'Tournament entry', 1000, 'svc'], theater_seat: ['Eintritt', 'Admission', 10, 'seat'], theater_box: ['Logenplatz', 'Box seat', 300, 'seat'], perform: ['Auftritt buchen', 'Book a performance', 500, 'svc'],
  passage: ['Schiffspassage', 'Ship passage', 10, 'mile'], dock: ['Liegeplatz', 'Mooring', 100, 'day'], boatrent: ['Ruderboot mieten', 'Rent a rowboat', 100, 'day'], fish: ['Frischer Fisch', 'Fresh fish', 3, 'lb'], porter: ['Träger', 'Porter', 20, 'day'], navkit: ['Navigationswerkzeug', 'Navigator\'s tools', 2500, 'set'],
  tutoring: ['Unterricht (pro Tag)', 'Tuition (per day)', 500, 'day'], copyspell: ['Zauber abschreiben lassen (pro Grad)', 'Spell copying (per level)', 5000, 'svc'], lecture: ['Vorlesung besuchen', 'Attend a lecture', 100, 'svc'], consult: ['Beratung durch einen Magier', 'Consultation with a wizard', 1000, 'hr'],
  hireling: ['Ungelernte Hilfskraft', 'Untrained hireling', 20, 'day'], skilled: ['Gelernte Fachkraft', 'Skilled hireling', 200, 'day'], messenger: ['Bote', 'Messenger', 2, 'mile'], guide: ['Führer durchs Viertel', 'Guide through the quarter', 50, 'day'], guard_hire: ['Leibwache', 'Bodyguard', 200, 'day'], coach: ['Kutschfahrt', 'Coach ride', 3, 'mile'], toll: ['Brückenzoll', 'Bridge toll', 1, 'pc'],
  fence: ['Hehlerei (Anteil vom Wert)', 'Fencing (cut of the value)', 1000, 'svc'], forgery: ['Gefälschtes Dokument', 'Forged document', 2000, 'svc'], thievestools: ['Diebeswerkzeug', 'Thieves\' tools', 2500, 'set'], info: ['Information', 'Information', 500, 'svc'], disguise: ['Verkleidungsset', 'Disguise kit', 2500, 'set'], smuggle: ['Schmuggelware (Kiste)', 'Contraband (crate)', 5000, 'pc'], passage_secret: ['Heimliche Passage', 'Secret passage out', 2500, 'svc'], cultrelic: ['Kultreliquie', 'Cult relic', 2000, 'pc'],
  grain: ['Getreide', 'Grain', 1, 'lb'], eggs: ['Eier (Dutzend)', 'Eggs (dozen)', 5, 'set'], milk: ['Milch', 'Milk', 2, 'pitcher'], goat: ['Ziege', 'Goat', 100, 'pc'], sheep: ['Schaf', 'Sheep', 200, 'pc'], cow: ['Kuh', 'Cow', 1000, 'pc'], pig: ['Schwein', 'Pig', 300, 'pc'], wool: ['Wolle', 'Wool', 10, 'lb'], apples: ['Äpfel', 'Apples', 1, 'lb'], hay: ['Heu (Ballen)', 'Hay (bale)', 5, 'pc'],
  ore: ['Eisenerz', 'Iron ore', 10, 'lb'], silverore: ['Silbererz', 'Silver ore', 500, 'lb'], pick_tool: ['Spitzhacke', 'Miner\'s pick', 200, 'pc'], lamp: ['Grubenlampe', 'Miner\'s lamp', 50, 'pc'],
  f_coins: ['Alte Münzen', 'Old coins', 1500, 'find'], f_gem: ['Ungeschliffener Edelstein', 'Uncut gem', 5000, 'find'], f_bones: ['Knochen und rostige Ausrüstung', 'Bones and rusty gear', 10, 'find'], f_idol: ['Kleines Götzenbild', 'Small idol', 2500, 'find'], f_scroll: ['Verblasste Schriftrolle', 'Faded scroll', 7500, 'find'], f_weapon: ['Gut erhaltene Waffe', 'Well-kept weapon', 1500, 'find'], f_crystal: ['Leuchtkristalle', 'Glowing crystals', 1000, 'find'], f_mushroom: ['Höhlenpilze', 'Cave mushrooms', 50, 'find'], f_map: ['Halbe Schatzkarte', 'Half a treasure map', 0, 'find'], f_jewel: ['Grabbeigabe (Schmuck)', 'Grave goods (jewellery)', 10000, 'find'], f_tome: ['Altes Tagebuch', 'Old journal', 500, 'find'], f_potion: ['Unbekannter Trank', 'Unknown potion', 5000, 'find'], f_herbs: ['Seltene Kräuter', 'Rare herbs', 500, 'find'], f_loot: ['Erbeutete Waren', 'Stolen goods', 3000, 'find'], f_chest: ['Verschlossene Truhe', 'Locked chest', 10000, 'find'], f_amber: ['Bernstein', 'Amber', 10000, 'find'], f_relic: ['Heilige Reliquie', 'Holy relic', 20000, 'find']
};

/* Arten von Orten: k, de, Genus (m/f/n), en, Symbol, Gruppe, Sortiment, Anzahl, Beruf des Betreibers, Namensmuster, Standard-Stil, Standard-Umgebung, wild = Funde statt Waren */
const K = (k, de, g, en, icon, grp, goods, n, prof, nm, style, dist, wild) => ({ k, de, g, en, icon, grp, goods, n, prof, nm, style: style || 'common', dist: dist || 'civic', wild: !!wild });
const KINDS = [
  K('tavern', 'Taverne', 'f', 'Tavern', '🍺', 0, ['ale', 'wine', 'mead', 'spirits', 'cider', 'stew', 'meal', 'roast', 'bread', 'cheese', 'dice', 'room', 'bunk', 'cards'], [5, 9], 'innkeeper', 'inn'),
  K('inn', 'Gasthaus', 'n', 'Inn', '🛏️', 0, ['bunk', 'room', 'suite', 'stabling', 'bath', 'meal', 'roast', 'stew', 'ale', 'wine', 'finewine', 'rations', 'feed', 'messenger'], [6, 10], 'innkeeper', 'inn'),
  K('dive', 'Spelunke', 'f', 'Dive', '🕯️', 0, ['ale', 'spirits', 'stew', 'bunk', 'dice', 'cards', 'info', 'hireling', 'bread'], [4, 7], 'innkeeper', 'inn', 'poor', 'poor'),
  K('teahouse', 'Teehaus', 'n', 'Teahouse', '🍵', 0, ['tea', 'tea_herb', 'pastry', 'cake', 'meal', 'wine', 'cards'], [4, 6], 'cook', 'inn', 'rich', 'merchant'),
  K('bathhouse', 'Badehaus', 'n', 'Bathhouse', '🛁', 0, ['bath', 'shave', 'massage', 'soap', 'perfume', 'tea', 'tend'], [4, 6], 'servant', 'inn'),
  K('waystation', 'Rasthaus', 'n', 'Waystation', '🐴', 0, ['bunk', 'room', 'stabling', 'feed', 'stew', 'ale', 'rations', 'rent_horse', 'horseshoe', 'waterskin'], [5, 8], 'innkeeper', 'inn', 'common', 'outside'),
  K('general', 'Gemischtwarenladen', 'm', 'General store', '🛒', 1, ['backpack', 'bedroll', 'blanket', 'candle', 'crowbar', 'oil', 'rope', 'lantern', 'torch', 'rations', 'tinder', 'waterskin', 'grapple', 'piton', 'tent', 'chalk', 'sack', 'pouch', 'soap', 'mirror', 'whetstone', 'caltrops', 'ballbear', 'manacles'], [8, 14], 'shopkeeper', 'shop'),
  K('smithy', 'Schmiede', 'f', 'Smithy', '⚒️', 1, ['horseshoe', 'repair', 'sharpen', 'nails', 'pot', 'tools_smith', 'dagger', 'handaxe', 'spear', 'mace', 'shield', 'piton', 'manacles', 'lock'], [6, 10], 'smith', 'shop'),
  K('weaponsmith', 'Waffenschmiede', 'f', 'Weaponsmith', '⚔️', 1, ['dagger', 'club', 'handaxe', 'spear', 'mace', 'shortsword', 'longsword', 'rapier', 'greatsword', 'battleaxe', 'warhammer', 'scimitar', 'halberd', 'javelin', 'repair', 'sharpen'], [7, 11], 'smith', 'shop'),
  K('armorer', 'Rüstungsschmiede', 'f', 'Armourer', '🛡️', 1, ['padded', 'leather', 'studded', 'hide', 'chainshirt', 'scale', 'breastplate', 'halfplate', 'chainmail', 'splint', 'plate', 'shield', 'armorfix'], [6, 10], 'smith', 'shop'),
  K('bowyer', 'Bogenmacherei', 'f', 'Bowyer', '🏹', 1, ['shortbow', 'longbow', 'lcrossbow', 'hcrossbow', 'arrows', 'bolts', 'javelin', 'repair', 'strings'], [5, 8], 'hunter', 'shop'),
  K('alchemist', 'Alchemistenladen', 'm', 'Alchemist', '⚗️', 1, ['acid', 'alchfire', 'antitoxin', 'healpot', 'greaterheal', 'poison', 'holywater', 'alchsupp', 'perfume', 'smokestick', 'oil', 'sleepdraught'], [6, 9], 'alchemist', 'shop'),
  K('herbalist', 'Kräuterladen', 'm', 'Herbalist', '🌿', 1, ['herbs', 'herbkit', 'tea_herb', 'salve', 'sleepdraught', 'spice', 'mushroom', 'antitoxin', 'healpot', 'healkit'], [5, 8], 'herbalist', 'shop'),
  K('magic', 'Magieladen', 'm', 'Magic shop', '✨', 1, ['focus_crystal', 'wand', 'orb', 'comppouch', 'spellbook', 'scroll1', 'scroll2', 'identify', 'pearl', 'ink', 'magicitem', 'healpot'], [6, 10], 'wizard', 'shop', 'rich', 'merchant'),
  K('tailor', 'Schneiderei', 'f', 'Tailor', '🧵', 1, ['commonclothes', 'travelclothes', 'fineclothes', 'costume', 'robe', 'cloak', 'tailoring', 'linen', 'silk', 'boots', 'pouch'], [6, 9], 'tailor', 'shop'),
  K('jeweler', 'Juwelier', 'm', 'Jeweller', '💎', 1, ['ring_silver', 'necklace', 'gem10', 'gem50', 'gem100', 'gem500', 'appraise', 'brooch', 'pearl'], [5, 8], 'merchant', 'shop', 'rich', 'rich'),
  K('bakery', 'Bäckerei', 'f', 'Bakery', '🥖', 1, ['bread', 'cake', 'pie', 'pastry', 'flour', 'rations'], [4, 6], 'baker', 'shop'),
  K('butcher', 'Metzgerei', 'f', 'Butcher', '🥩', 1, ['meat', 'sausage', 'ham', 'chicken', 'salt', 'rations'], [4, 6], 'cook', 'shop'),
  K('bookshop', 'Buchhandlung', 'f', 'Bookshop', '📚', 1, ['book', 'paper', 'parchment', 'pen', 'ink', 'letter', 'copy', 'mapcase', 'localmap', 'spellbook'], [6, 9], 'scholar', 'shop'),
  K('pawn', 'Pfandleihe', 'f', 'Pawnshop', '⚖️', 1, ['pawn_misc', 'pawn_sword', 'pawn_lute', 'pawn_loan', 'spyglass', 'hourglass', 'mirror', 'lock', 'brooch', 'fineclothes'], [6, 9], 'merchant', 'shop', 'common', 'poor'),
  K('stable', 'Mietstall', 'm', 'Livery stable', '🐎', 1, ['horse', 'drafthorse', 'pony', 'mule', 'warhorse', 'saddle', 'saddlebags', 'feed', 'stabling', 'cart', 'wagon', 'rent_horse', 'horseshoe'], [6, 10], 'stablehand', 'shop'),
  K('market', 'Marktstand', 'm', 'Market stall', '🧺', 1, ['apples', 'bread', 'cheese', 'eggs', 'chicken', 'fish', 'spice', 'linen', 'pie', 'sausage', 'herbs', 'candle'], [4, 7], 'peddler', 'shop'),
  K('carpentry', 'Tischlerei', 'f', 'Carpentry', '🪚', 1, ['plank', 'chest', 'barrel', 'ladder', 'pole', 'tools_carp', 'furniture', 'repair'], [5, 7], 'carpenter', 'shop'),
  K('cartographer', 'Kartografenstube', 'f', 'Cartographer', '🧭', 1, ['localmap', 'mapcase', 'cartokit', 'paper', 'ink', 'navkit', 'copy', 'guide'], [5, 7], 'scholar', 'shop'),
  K('instruments', 'Instrumentenbauer', 'm', 'Instrument maker', '🎻', 1, ['lute', 'flute', 'drum', 'lyre', 'viol', 'strings', 'perform', 'repair'], [5, 7], 'bard', 'shop'),
  K('temple', 'Tempel', 'm', 'Temple', '⛪', 2, ['cure', 'restore', 'removecurse', 'raise', 'blessing', 'augury', 'burial', 'holysym', 'holywater', 'prayer', 'wedding', 'healpot'], [6, 9], 'priest', 'temple'),
  K('shrine', 'Schrein', 'm', 'Shrine', '🕯️', 2, ['blessing', 'prayer', 'holysym', 'holywater', 'cure'], [3, 5], 'acolyte', 'temple'),
  K('healer', 'Heilerhaus', 'n', 'House of healing', '⚕️', 2, ['tend', 'cure_dis', 'bed_sick', 'salve', 'healkit', 'herbs', 'healpot', 'cure', 'restore'], [5, 8], 'healer', 'civic'),
  K('townhall', 'Rathaus', 'n', 'Town hall', '🏛️', 2, ['permit', 'fine', 'tax', 'records', 'bounty', 'contract'], [3, 6], 'mayor', 'civic'),
  K('library', 'Bibliothek', 'f', 'Library', '📜', 2, ['research', 'copy', 'records', 'book', 'paper', 'localmap'], [3, 6], 'scholar', 'civic'),
  K('guildhall', 'Gildenhaus', 'n', 'Guildhall', '🏢', 2, ['guildfee', 'contract', 'skilled', 'hireling', 'letterofcredit', 'info'], [3, 6], 'merchant', 'civic', 'common', 'merchant'),
  K('bank', 'Wechselstube', 'f', 'Counting house', '🪙', 2, ['exchange', 'deposit', 'loan', 'letterofcredit', 'appraise', 'contract'], [4, 6], 'merchant', 'civic', 'rich', 'merchant'),
  K('guardhouse', 'Wachhaus', 'n', 'Guardhouse', '💂', 2, ['fine', 'bounty', 'bail', 'permit', 'guard_hire', 'manacles'], [3, 5], 'captain', 'civic'),
  K('prison', 'Kerker', 'm', 'Prison', '⛓️', 2, ['bail', 'visit', 'fine', 'info'], [2, 4], 'guard', 'civic', 'restricted'),
  K('arena', 'Arena', 'f', 'Arena', '🏟️', 2, ['arena_seat', 'arena_vip', 'bet', 'fight', 'ale', 'pie'], [4, 6], 'gladiator', 'civic'),
  K('theater', 'Theater', 'n', 'Theatre', '🎭', 2, ['theater_seat', 'theater_box', 'perform', 'wine', 'costume'], [3, 5], 'bard', 'civic'),
  K('harbor', 'Hafen', 'm', 'Harbour', '⚓', 2, ['passage', 'dock', 'boatrent', 'fish', 'porter', 'navkit', 'rope', 'barrel', 'smuggle'], [5, 8], 'shipcaptain', 'civic', 'common', 'merchant'),
  K('academy', 'Akademie', 'f', 'Academy', '🎓', 2, ['tutoring', 'lecture', 'research', 'copyspell', 'book', 'consult'], [4, 6], 'scholar', 'civic', 'restricted', 'rich'),
  K('magetower', 'Magierturm', 'm', 'Wizard\'s tower', '🔮', 2, ['consult', 'identify', 'copyspell', 'scroll1', 'scroll2', 'spellbook', 'comppouch', 'magicitem'], [4, 7], 'wizard', 'civic', 'restricted'),
  K('graveyard', 'Friedhof', 'm', 'Graveyard', '🪦', 2, ['burial', 'prayer', 'blessing', 'holywater'], [2, 4], 'gravedigger', 'civic'),
  K('palace', 'Palast', 'm', 'Palace', '👑', 3, ['permit', 'contract', 'bounty', 'feast', 'finewine', 'fineclothes'], [3, 5], 'king', 'noble', 'restricted', 'rich'),
  K('castle', 'Burg', 'f', 'Castle', '🏰', 3, ['permit', 'tax', 'bounty', 'guard_hire', 'stabling', 'feast'], [3, 5], 'noble', 'noble', 'restricted', 'outside'),
  K('manor', 'Herrenhaus', 'n', 'Manor', '🏡', 3, ['feast', 'finewine', 'skilled', 'contract', 'stabling'], [2, 4], 'noble', 'noble', 'restricted', 'rich'),
  K('thieves', 'Diebesversteck', 'n', 'Thieves\' den', '🗝️', 4, ['fence', 'forgery', 'thievestools', 'info', 'disguise', 'poison', 'passage_secret', 'f_loot'], [4, 7], 'thief', 'inn', 'restricted', 'poor'),
  K('smugglers', 'Schmugglerlager', 'n', 'Smugglers\' cache', '📦', 4, ['smuggle', 'passage_secret', 'spice', 'silk', 'finewine', 'poison', 'info'], [4, 6], 'smuggler', 'wild', 'restricted', 'poor'),
  K('cult', 'Kultstätte', 'f', 'Cult site', '🕯️', 4, ['cultrelic', 'poison', 'info', 'f_idol', 'f_scroll', 'f_relic'], [3, 5], 'cultist', 'wild', 'restricted', 'poor', true),
  K('gambling', 'Spielhölle', 'f', 'Gambling den', '🎲', 4, ['dice', 'cards', 'bet', 'spirits', 'ale', 'loan', 'info'], [4, 6], 'thief', 'inn', 'common', 'poor'),
  K('sewer', 'Kanalisation', 'f', 'Sewers', '🐀', 4, ['f_bones', 'f_coins', 'f_loot', 'f_weapon', 'f_tome'], [2, 4], 'beggar', 'wild', 'poor', 'poor', true),
  K('cave', 'Höhle', 'f', 'Cave', '🕳️', 5, ['f_bones', 'f_coins', 'f_gem', 'f_crystal', 'f_mushroom', 'f_weapon', 'f_map', 'f_potion', 'f_chest'], [2, 5], '', 'wild', 'common', 'outside', true),
  K('ruin', 'Ruine', 'f', 'Ruin', '🏚️', 5, ['f_coins', 'f_idol', 'f_scroll', 'f_weapon', 'f_tome', 'f_map', 'f_chest', 'f_bones'], [2, 5], '', 'wild', 'common', 'outside', true),
  K('towerruin', 'Turmruine', 'f', 'Ruined tower', '🗼', 5, ['f_scroll', 'f_tome', 'f_potion', 'f_crystal', 'f_coins', 'f_map'], [2, 4], '', 'wild', 'common', 'outside', true),
  K('tomb', 'Gruft', 'f', 'Tomb', '⚰️', 5, ['f_jewel', 'f_coins', 'f_relic', 'f_weapon', 'f_bones', 'f_idol', 'f_chest'], [2, 5], '', 'wild', 'restricted', 'outside', true),
  K('mine', 'Mine', 'f', 'Mine', '⛏️', 5, ['ore', 'silverore', 'pick_tool', 'lamp', 'hireling', 'f_gem', 'f_crystal'], [3, 6], 'miner', 'wild', 'common', 'outside'),
  K('grove', 'Hain', 'm', 'Grove', '🌳', 5, ['f_herbs', 'f_amber', 'herbs', 'f_mushroom', 'blessing'], [2, 4], 'herbalist', 'wild', 'common', 'outside', true),
  K('lighthouse', 'Leuchtturm', 'm', 'Lighthouse', '🗼', 5, ['info', 'oil', 'fish', 'boatrent', 'bunk'], [2, 4], 'sailor', 'wild', 'common', 'outside'),
  K('mill', 'Mühle', 'f', 'Mill', '🌾', 5, ['flour', 'grain', 'bread', 'hay', 'hireling'], [3, 5], 'farmer', 'wild', 'common', 'outside'),
  K('farm', 'Bauernhof', 'm', 'Farm', '🐄', 5, ['eggs', 'milk', 'cheese', 'apples', 'grain', 'goat', 'sheep', 'cow', 'pig', 'wool', 'hay', 'chicken', 'bunk'], [5, 9], 'farmer', 'wild', 'poor', 'outside'),
  K('banditcamp', 'Banditenlager', 'n', 'Bandit camp', '⛺', 5, ['f_loot', 'f_coins', 'f_weapon', 'f_map', 'rations', 'spirits'], [3, 5], 'merc', 'wild', 'restricted', 'outside', true),
  K('tollbridge', 'Zollbrücke', 'f', 'Toll bridge', '🌉', 5, ['toll', 'tax', 'info', 'guide', 'rations'], [2, 4], 'guard', 'wild', 'common', 'outside')
];
const KIND_GROUPS = [['Gastgewerbe', 'Hospitality'], ['Läden & Handwerk', 'Shops & crafts'], ['Öffentlich & Glaube', 'Public & faith'], ['Adel & Macht', 'Nobility & power'], ['Unterwelt', 'Underworld'], ['Land & Wildnis', 'Country & wilds']];
const KBY = {}; KINDS.forEach(k => { KBY[k.k] = k; });

/* Stil, Umgebung, Reichtum → Preisfaktoren */
const STYLES = { poor: { n: ['Für Arme', 'For the poor'], f: .6 }, common: { n: ['Für jedermann', 'For everyone'], f: 1 }, rich: { n: ['Für Reiche', 'For the wealthy'], f: 1.8 }, restricted: { n: ['Beschränkter Zutritt', 'Restricted access'], f: 1.4 }, custom: { n: ['Eigener Stil …', 'Custom style …'], f: 1 } };
const DISTRICTS = { rich: { n: ['Reichenviertel', 'Wealthy quarter'], f: 1.35 }, merchant: { n: ['Händlerviertel', 'Merchant quarter'], f: .95 }, civic: { n: ['Bürgerlich', 'Middle-class'], f: 1 }, poor: { n: ['Armenviertel', 'Poor quarter'], f: .8 }, outside: { n: ['Außerhalb / Wildnis', 'Outside town / wilds'], f: 1.1 } };
const CITY_F = { arm: .85, normal: 1, reich: 1.15, 'fürstlich': 1.3 };
function priceFactor(p, cityWealth) {
  const s = STYLES[p.style] ? STYLES[p.style].f : 1; const sf = p.style === 'custom' && +p.styleF > 0 ? +p.styleF : s;
  return sf * (DISTRICTS[p.district] ? DISTRICTS[p.district].f : 1) * (CITY_F[cityWealth] || 1);
}
function nice(cp) { // auf übliche Münzbeträge runden
  if (cp <= 0) return 0; if (cp < 20) return Math.max(1, Math.round(cp));
  if (cp < 200) return Math.round(cp / 5) * 5; if (cp < 1000) return Math.round(cp / 10) * 10;
  if (cp < 5000) return Math.round(cp / 50) * 50; if (cp < 20000) return Math.round(cp / 100) * 100;
  return Math.round(cp / 500) * 500;
}
function priceOf(base, p, cityWealth, jitter) { return nice(base * priceFactor(p, cityWealth) * (jitter || 1)); }
function fmtPrice(cp, lang) {
  const en = lang === 'en'; if (!cp) return en ? '—' : '—';
  let g = Math.floor(cp / 100), s = Math.floor((cp % 100) / 10), c = cp % 10; const out = [];
  if (g) out.push(g.toLocaleString(en ? 'en-GB' : 'de-DE') + (en ? ' gp' : ' GM')); if (s) out.push(s + (en ? ' sp' : ' SM')); if (c) out.push(c + (en ? ' cp' : ' KM'));
  return out.join(' ');
}
function parsePrice(t) {
  const s = String(t || '').toLowerCase().replace(',', '.'); let cp = 0, any = false;
  s.replace(/(\d+(?:\.\d+)?)\s*(pm|pp|gm|gp|g|sm|sp|s|km|cp|k|c)?\b/g, (_, n, u) => { any = true; const v = parseFloat(n); const f = !u ? 100 : /^p/.test(u) ? 1000 : /^g/.test(u) ? 100 : /^s/.test(u) ? 10 : 1; cp += v * f; return ''; });
  return any ? Math.round(cp) : null;
}

/* Sortiment würfeln */
function rollGoods(kindKey, p, cityWealth, lang) {
  const K = KBY[kindKey]; if (!K) return [];
  const [a, b] = K.n; const n = Math.min(K.goods.length, rint(a, b));
  let pool = K.goods.slice();
  // teure Waren seltener in armen Läden, billige seltener in reichen
  if (p.style === 'poor' || p.district === 'poor') pool = pool.filter(k => C[k][2] <= 20000 || rnd() < .25);
  if (p.style === 'rich') pool = pool.filter(k => C[k][2] >= 3 || rnd() < .5);
  const keys = shuffle(pool).slice(0, n).sort((x, y) => C[x][2] - C[y][2]);
  return keys.map(k => { const find = C[k][3] === 'find'; const j = find ? .6 + rnd() * .8 : .9 + rnd() * .2; return { id: Math.random().toString(36).slice(2, 9), key: k, n: L([C[k][0], C[k][1]], lang), unit: L(U[C[k][3]], lang), base: C[k][2], j, find, price: find ? nice(C[k][2] * j) : priceOf(C[k][2], p, cityWealth, j), manual: false }; });
}
function repriceAll(p, cityWealth) { (p.goods || []).forEach(g => { if (!g.manual && g.base > 0 && !g.find) g.price = priceOf(g.base, p, cityWealth, g.j || 1); }); }

/* Namen */
const ADJ = [['Golden', 'Golden'], ['Silbern', 'Silver'], ['Tanzend', 'Dancing'], ['Rostig', 'Rusty'], ['Schlafend', 'Sleeping'], ['Lachend', 'Laughing'], ['Schwarz', 'Black'], ['Rot', 'Red'], ['Grün', 'Green'], ['Blau', 'Blue'], ['Alt', 'Old'], ['Lustig', 'Merry'], ['Krumm', 'Crooked'], ['Einäugig', 'One-Eyed'], ['Durstig', 'Thirsty'], ['Fett', 'Fat'], ['Flink', 'Nimble'], ['Brüllend', 'Roaring'], ['Verloren', 'Lost'], ['Treu', 'Faithful']];
const NOUN = [['Hirsch', 'm', 'Stag'], ['Gans', 'f', 'Goose'], ['Krug', 'm', 'Tankard'], ['Drache', 'm', 'Dragon'], ['Eber', 'm', 'Boar'], ['Laterne', 'f', 'Lantern'], ['Pony', 'n', 'Pony'], ['Schwan', 'm', 'Swan'], ['Anker', 'm', 'Anchor'], ['Krone', 'f', 'Crown'], ['Fass', 'n', 'Barrel'], ['Ratte', 'f', 'Rat'], ['Greif', 'm', 'Griffin'], ['Hahn', 'm', 'Rooster'], ['Ross', 'n', 'Steed'], ['Schild', 'm', 'Shield'], ['Kessel', 'm', 'Kettle'], ['Rabe', 'm', 'Raven'], ['Mond', 'm', 'Moon'], ['Harfe', 'f', 'Harp'], ['Bär', 'm', 'Bear'], ['Eule', 'f', 'Owl']];
const WADJ = [['Flüsternd', 'Whispering'], ['Vergessen', 'Forgotten'], ['Verflucht', 'Cursed'], ['Schwarz', 'Black'], ['Kalt', 'Cold'], ['Tief', 'Deep'], ['Einsam', 'Lonely'], ['Versunken', 'Sunken'], ['Zerbrochen', 'Broken'], ['Heulend', 'Howling'], ['Verborgen', 'Hidden'], ['Alt', 'Old'], ['Neblig', 'Misty'], ['Rot', 'Red'], ['Still', 'Silent'], ['Grau', 'Grey']];
const STRONG = { m: 'er', f: 'e', n: 'es' };
const DEITY = [['der Morgenröte', 'of the Dawn'], ['der Ewigen Flamme', 'of the Eternal Flame'], ['des Stillen Mondes', 'of the Silent Moon'], ['der Gnädigen Mutter', 'of the Merciful Mother'], ['des Schmiedevaters', 'of the Forge Father'], ['der Sieben Sterne', 'of the Seven Stars'], ['des Lichtbringers', 'of the Lightbringer'], ['der Wogen', 'of the Waves'], ['des Grünen Mantels', 'of the Green Mantle'], ['der Letzten Ruhe', 'of Last Rest'], ['des Wanderers', 'of the Wanderer'], ['der Gerechten Waage', 'of the Just Scales']];
const SUR = [['Raben', 'Raven'], ['Eichen', 'Oak'], ['Stein', 'Stone'], ['Falken', 'Falcon'], ['Wolfs', 'Wolf'], ['Silber', 'Silver'], ['Hirsch', 'Hart'], ['Sturm', 'Storm']];
const SURF = [['fels', 'rock'], ['stein', 'stone'], ['berg', 'mount'], ['hain', 'grove'], ['eck', 'watch'], ['tal', 'dale']];
function strongAdj(stem, g) { return stem + (stem.endsWith('e') ? STRONG[g].slice(1) : STRONG[g]); }
function rollPoiName(kindKey, o, lang) {
  o = o || {}; const K = KBY[kindKey]; const en = lang === 'en';
  const kl = K ? L([K.de, K.en], lang) : (o.kindText || (en ? 'Place' : 'Ort'));
  const g = K ? K.g : 'm'; const nm = K ? K.nm : 'shop';
  const owner = o.owner || '';
  const city = o.city || '';
  const sur = () => { const p = pick(SUR), s = pick(SURF); return en ? p[1] + s[1] : p[0] + s[0]; };
  if (nm === 'inn') { const a = pick(ADJ), n = pick(NOUN); return en ? 'The ' + a[1] + ' ' + n[2] : (n[1] === 'f' ? 'Zur ' : 'Zum ') + a[0] + 'en ' + n[0]; }
  if (nm === 'shop') {
    if (owner && rnd() < .65) { const f = owner.replace(/^(Sir|Dame|Herr|Frau|Lord|Lady|Käpt'n|Captain|Meister|Meisterin|Magister|Magistra)\s+/, '').split(/[\s„"]/)[0]; return en ? f + '\'s ' + kl : f + (/[sßxz]$/.test(f) ? '’ ' : 's ') + kl; }
    if (rnd() < .5) { const a = pick(ADJ); return en ? 'The ' + a[1] + ' ' + kl : (g === 'f' ? 'Die ' : g === 'n' ? 'Das ' : 'Der ') + a[0] + 'e ' + kl; }
    return en ? sur() + ' ' + kl : kl + ' ' + sur();
  }
  if (nm === 'temple') return en ? kl + ' ' + pick(DEITY)[1] : kl + ' ' + pick(DEITY)[0];
  if (nm === 'civic') { if (city && rnd() < .6) return en ? city + ' ' + kl : kl + ' von ' + city; const a = pick([['Alt', 'Old'], ['Neu', 'New'], ['Groß', 'Great'], ['Ober', 'Upper'], ['Unter', 'Lower']]); return en ? a[1] + ' ' + kl : strongAdj(a[0], g) + ' ' + kl; }
  if (nm === 'noble') { if (kindKey === 'palace' && city && rnd() < .5) return en ? 'Palace of ' + city : 'Palast von ' + city; return en ? sur() + ' ' + kl : kl + ' ' + sur(); }
  const a = pick(WADJ); return en ? 'The ' + a[1] + ' ' + kl : strongAdj(a[0], g) + ' ' + kl;
}
/* Atmosphäre usw. */
const PTRAITS = {
  atmo: { n: ['Atmosphäre', 'Atmosphere'], v: [['Rauchig, laut und gemütlich', 'Smoky, loud and cosy'], ['Totenstill – jeder Schritt hallt', 'Dead silent – every step echoes'], ['Es riecht nach frischem Brot und Lavendel', 'It smells of fresh bread and lavender'], ['Kalt und feucht, Wasser tropft von der Decke', 'Cold and damp, water drips from the ceiling'], ['Prunkvoll, aber etwas verstaubt', 'Splendid but a little dusty'], ['Hektisch – alle reden durcheinander', 'Hectic – everyone talks at once'], ['Gedämpftes Licht, flüsternde Gespräche', 'Dim light, whispered conversations'], ['Sauber, ordentlich, fast steril', 'Clean, orderly, almost sterile'], ['Bunt, chaotisch, überall Kram', 'Colourful, chaotic, clutter everywhere'], ['Bedrückend – etwas stimmt hier nicht', 'Oppressive – something is wrong here'], ['Heiter, Musik spielt im Hintergrund', 'Cheerful, music plays in the background'], ['Zugig, das Gebäude knarzt im Wind', 'Draughty, the building creaks in the wind']] },
  feature: { n: ['Besonderheit', 'Feature'], v: [['Ein ausgestopfter Bär in der Ecke', 'A stuffed bear in the corner'], ['Ein Hund, der jeden Gast beschnüffelt', 'A dog that sniffs every guest'], ['Eine Wand voller Steckbriefe', 'A wall full of wanted posters'], ['Ein Geheimgang hinter einem Regal', 'A secret passage behind a shelf'], ['Ein riesiger Kamin mit Wappen', 'A huge fireplace with a coat of arms'], ['Ein sprechender Papagei, der Geheimnisse ausplaudert', 'A talking parrot that blabs secrets'], ['Alte Wandmalereien einer vergessenen Schlacht', 'Old murals of a forgotten battle'], ['Ein Brunnen mitten im Raum', 'A well in the middle of the room'], ['Ein verschlossener Raum, den niemand betreten darf', 'A locked room no one may enter'], ['Eine Glocke, die zu jeder vollen Stunde läutet', 'A bell that rings every hour'], ['Seltsame Runen am Türrahmen', 'Strange runes on the door frame'], ['Ein Aushang: „Helfer gesucht“', 'A notice: "Help wanted"']] },
  clients: { n: ['Kundschaft', 'Clientele'], v: [['Hafenarbeiter und Seeleute', 'Dockworkers and sailors'], ['Wohlhabende Bürger und Kaufleute', 'Wealthy burghers and merchants'], ['Abenteurer auf der Durchreise', 'Adventurers passing through'], ['Wachsoldaten nach Dienstschluss', 'Off-duty guards'], ['Studenten und Gelehrte', 'Students and scholars'], ['Zwielichtige Gestalten', 'Shady characters'], ['Bauern vom Umland', 'Farmers from the countryside'], ['Adelige mit Gefolge', 'Nobles with their retinue'], ['Pilger und Gläubige', 'Pilgrims and the faithful'], ['Fast niemand – das Geschäft läuft schlecht', 'Hardly anyone – business is bad'], ['Stammgäste, die jeden Neuen anstarren', 'Regulars who stare at every newcomer'], ['Handwerker der Zunft', 'Guild craftsfolk']] },
  hook: { n: ['Aufhänger / Gerücht', 'Hook / rumour'], v: [['Der Besitzer sucht jemanden, der Schulden eintreibt', 'The owner needs someone to collect debts'], ['Seit Tagen verschwinden Vorräte aus dem Keller', 'Supplies have been vanishing from the cellar for days'], ['Ein Stammgast wurde tot aufgefunden', 'A regular was found dead'], ['Hier soll ein alter Schatz versteckt sein', 'An old treasure is said to be hidden here'], ['Ein Konkurrent will den Laden ruinieren', 'A rival wants to ruin the business'], ['Nachts hört man Kratzen unter dem Boden', 'At night there is scratching beneath the floor'], ['Ein Fremder hat eine Nachricht für die Gruppe hinterlassen', 'A stranger left a message for the party'], ['Die Wache durchsucht den Ort regelmäßig', 'The watch searches the place regularly'], ['Eine Lieferung ist überfällig – jemand muss nachsehen', 'A delivery is overdue – someone must look into it'], ['Ein Fluch liegt auf dem Gebäude', 'A curse lies on the building'], ['Hier trifft sich heimlich eine Fraktion', 'A faction meets here in secret'], ['Alles ganz normal – oder?', 'Perfectly normal – or is it?']] }
};
const PTRAIT_KEYS = Object.keys(PTRAITS);
function rollPTrait(k, lang, not) { const T = PTRAITS[k]; let v; for (let i = 0; i < 6; i++) { v = L(pick(T.v), lang); if (v !== not) break; } return v; }
function defaults(kindKey) { const K = KBY[kindKey]; return { style: K ? K.style : 'common', district: K ? K.dist : 'civic' }; }
function styleFromCity(K, cityWealth) { // kleine Variation je nach Stadt
  if (!K) return 'common'; if (K.style !== 'common') return K.style;
  if (cityWealth === 'arm' && rnd() < .5) return 'poor'; if ((cityWealth === 'reich' || cityWealth === 'fürstlich') && rnd() < .35) return 'rich';
  return rnd() < .12 ? pick(['poor', 'rich']) : 'common';
}
function districtFor(K, style) { if (!K) return 'civic'; if (K.dist !== 'civic') return K.dist; return style === 'rich' ? pick(['rich', 'merchant']) : style === 'poor' ? 'poor' : pick(['civic', 'civic', 'merchant']); }
function rollPoi(cur, ctx, lang) {
  cur = cur || {}; ctx = ctx || {}; const p = Object.assign({}, cur); p.lock = Object.assign({}, cur.lock); p.traits = Object.assign({}, cur.traits || {});
  if (!p.lock.kind && !p.kind) p.kind = pick(KINDS).k;
  const K = KBY[p.kind];
  if (!p.lock.style) p.style = styleFromCity(K, ctx.cityWealth);
  if (!p.lock.district) p.district = districtFor(K, p.style);
  if (!p.lock.goods) { const keep = (cur.goods || []).filter(g => g.manual || !g.key); p.goods = rollGoods(p.kind, p, ctx.cityWealth, lang).concat(keep); }
  else repriceAll(p, ctx.cityWealth);
  if (!p.lock.name) p.name = rollPoiName(p.kind, { owner: ctx.owner, city: p.city, kindText: p.kindText }, lang);
  PTRAIT_KEYS.forEach(k => { if (!p.lock['t_' + k]) p.traits[k] = rollPTrait(k, lang, p.traits[k]); });
  return p;
}
const API = { C, U, KINDS, KBY, KIND_GROUPS, STYLES, DISTRICTS, CITY_F, PTRAITS, PTRAIT_KEYS, priceFactor, priceOf, fmtPrice, parsePrice, rollGoods, repriceAll, rollPoiName, rollPTrait, rollPoi, defaults, L };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else W.SV_POI = API;
})(typeof window !== 'undefined' ? window : globalThis);
