/* Zauberdaten (nur Spielmechanik, D&D 5e PHB 2014 / SRD 5.1).
   Format: en|de|Grad|Zeit(A=Aktion,B=Bonus,R=Reaktion,M=länger)|Flags(C=Konz.,R=Ritual,H=halb bei Erfolg)|Modus|Schaden|Typ|Steigerung/Grad|Extras
   Modus: atk=Zauberangriff, save:ABL=Rettungswurf, heal=Heilung(+Mod), auto=trifft automatisch, ''=kein Wurf
   Extras: n=X Geschosse, n+=1 je Grad, beams=Strahlen nach Stufe, self=Effekt-ID für dich, smite=Trefferbonus, mod=+Attributsmod. auf Schaden */
window.CM_SPELLS_RAW = `
Acid Splash|Säurespritzer|0|A||save:DEX|1d6|acid||
Blade Ward|Klingenbann|0|A|||||| self=bladeWard
Booming Blade|Dröhnende Klinge|0|A||weapon|0d8|thunder||note
Chill Touch|Kalte Hand|0|A||atk|1d8|necrotic||
Create Bonfire|Lagerfeuer|0|A|CH|save:DEX|1d8|fire||
Dancing Lights|Tanzende Lichter|0|A|C|||||
Druidcraft|Druidenkunst|0|A||||||
Eldritch Blast|Schauerlicher Strahl|0|A||atk|1d10|force||beams
Fire Bolt|Feuerpfeil|0|A||atk|1d10|fire||
Friends|Freunde|0|A|C|||||
Frostbite|Frostbiss|0|A||save:CON|1d6|cold||
Green-Flame Blade|Grünflammenklinge|0|A||weapon|0d8|fire||note
Guidance|Göttliche Führung|0|A|C||||| buff=guidance
Infestation|Befall|0|A||save:CON|1d6|poison||
Light|Licht|0|A||||||
Lightning Lure|Blitzköder|0|A||save:STR|1d8|lightning||
Mage Hand|Magierhand|0|A||||||
Mending|Ausbessern|0|M||||||
Message|Nachricht|0|A||||||
Mind Sliver|Gedankensplitter|0|A||save:INT|1d6|psychic||
Minor Illusion|Kleine Illusion|0|A||||||
Poison Spray|Giftspritzer|0|A||save:CON|1d12|poison||
Prestidigitation|Taschenspielerei|0|A||||||
Produce Flame|Flammen erzeugen|0|A||atk|1d8|fire||
Ray of Frost|Froststrahl|0|A||atk|1d8|cold||
Resistance|Resistenz|0|A|C||||| buff=resistance
Sacred Flame|Heilige Flamme|0|A||save:DEX|1d8|radiant||
Shillelagh|Shillelagh|0|B||||||self=shillelagh
Shocking Grasp|Schockgriff|0|A||atk|1d8|lightning||
Spare the Dying|Verschonung der Sterbenden|0|A||||||
Sword Burst|Klingenstoß|0|A||save:DEX|1d6|force||
Thaumaturgy|Thaumaturgie|0|A||||||
Thorn Whip|Dornenpeitsche|0|A||atk|1d6|piercing||
Toll the Dead|Totengeläut|0|A||save:WIS|1d8|necrotic||note
True Strike|Zielsicherheit|0|A|C|||||
Vicious Mockery|Gehässiger Spott|0|A||save:WIS|1d4|psychic||
Word of Radiance|Wort des Glanzes|0|A||save:CON|1d6|radiant||
Absorb Elements|Elemente absorbieren|1|R|||1d6|var|1d6|
Alarm|Alarm|1|M|R|||||
Animal Friendship|Tierfreundschaft|1|A||save:WIS||||
Armor of Agathys|Rüstung des Agathys|1|A||||||self=agathys
Arms of Hadar|Arme Hadars|1|A|H|save:STR|2d6|necrotic|1d6|
Bane|Fluch|1|A|C|save:CHA|||
Bless|Segnen|1|A|C||||| self=bless
Burning Hands|Brennende Hände|1|A|H|save:DEX|3d6|fire|1d6|
Catapult|Katapult|1|A||save:DEX|3d8|bludgeoning|1d8|
Charm Person|Person bezaubern|1|A||save:WIS||||
Chromatic Orb|Chromatische Kugel|1|A||atk|3d8|var|1d8|
Color Spray|Farbenspiel|1|A||||||
Command|Befehl|1|A||save:WIS||||
Compelled Duel|Erzwungenes Duell|1|B|C|save:WIS||||
Comprehend Languages|Sprachen verstehen|1|A|R|||||
Cure Wounds|Wunden heilen|1|A||heal|1d8||1d8|mod
Detect Evil and Good|Gutes und Böses entdecken|1|A|C|||||
Detect Magic|Magie entdecken|1|A|CR|||||
Disguise Self|Selbstverkleidung|1|A||||||
Dissonant Whispers|Dissonantes Flüstern|1|A|H|save:WIS|3d6|psychic|1d6|
Divine Favor|Göttliche Gunst|1|B|C||||| self=divineFavor
Ensnaring Strike|Fesselnder Schlag|1|B|C|save:STR|1d6|piercing|1d6|smite
Entangle|Verstricken|1|A|C|save:STR||||
Expeditious Retreat|Rasender Rückzug|1|B|C||||| self=expRetreat
Faerie Fire|Feenfeuer|1|A|C|save:DEX||||
False Life|Falsches Leben|1|A||||||self=falseLife
Feather Fall|Federfall|1|R||||||
Find Familiar|Vertrauten finden|1|M|R|||||
Fog Cloud|Nebelwolke|1|A|C|||||
Goodberry|Gute Beeren|1|A||||||
Grease|Schmieren|1|A||save:DEX||||
Guiding Bolt|Lenkendes Geschoss|1|A||atk|4d6|radiant|1d6|
Hail of Thorns|Dornenhagel|1|B|CH|save:DEX|1d10|piercing|1d10|smite
Healing Word|Heilendes Wort|1|B||heal|1d4||1d4|mod
Hellish Rebuke|Höllischer Tadel|1|R|H|save:DEX|2d10|fire|1d10|
Heroism|Heldenmut|1|A|C||||| self=heroism
Hex|Verhexen|1|B|C|||||self=hex
Hunter's Mark|Mal des Jägers|1|B|C|||||self=huntersMark
Ice Knife|Eismesser|1|A||atk|1d10|piercing|1d6|note
Identify|Identifizieren|1|M|R|||||
Inflict Wounds|Wunden verursachen|1|A||atk|3d10|necrotic|1d10|
Jump|Springen|1|A||||||
Longstrider|Schneller Schritt|1|A||||||self=longstrider
Mage Armor|Magierrüstung|1|A||||||self=mageArmor
Magic Missile|Magisches Geschoss|1|A||auto|1d4+1|force||n=3,n+=1
Protection from Evil and Good|Schutz vor Gut und Böse|1|A|C|||||self=protEvil
Ray of Sickness|Strahl der Übelkeit|1|A||atk|2d8|poison|1d8|
Sanctuary|Heiligtum|1|B||||||
Searing Smite|Sengender Schlag|1|B|C||1d6|fire|1d6|smite
Shield|Schild|1|R||||||self=shield
Shield of Faith|Schild des Glaubens|1|B|C|||||self=shieldOfFaith
Silent Image|Lautloses Trugbild|1|A|C|||||
Sleep|Schlaf|1|A||||||
Speak with Animals|Mit Tieren sprechen|1|A|R|||||
Tasha's Hideous Laughter|Taschas fürchterliches Gelächter|1|A|C|save:WIS||||
Thunderous Smite|Donnernder Schlag|1|B|C||2d6|thunder||smite
Thunderwave|Donnerwoge|1|A|H|save:CON|2d8|thunder|1d8|
Unseen Servant|Unsichtbarer Diener|1|A|R|||||
Witch Bolt|Hexenblitz|1|A|C|atk|1d12|lightning|1d12|
Wrathful Smite|Zorniger Schlag|1|B|C||1d6|psychic||smite
Aid|Beistand|2|A||||||self=aid
Alter Self|Gestalt verändern|2|A|C|||||
Barkskin|Borkenhaut|2|A|C|||||self=barkskin
Blindness/Deafness|Blindheit/Taubheit|2|A||save:CON||||
Blur|Verschwimmen|2|A|C|||||self=blur
Branding Smite|Brandmarkender Schlag|2|B|C||2d6|radiant|1d6|smite
Calm Emotions|Gefühle beruhigen|2|A|C|save:CHA||||
Cloud of Daggers|Dolchwolke|2|A|C||4d4|slashing|2d4|
Darkness|Dunkelheit|2|A|C|||||
Darkvision|Dunkelsicht|2|A||||||
Detect Thoughts|Gedanken wahrnehmen|2|A|C|||||
Dragon's Breath|Drachenodem|2|B|CH|save:DEX|3d6|var|1d6|
Enhance Ability|Attribut verbessern|2|A|C|||||self=enhance
Enlarge/Reduce|Vergrößern/Verkleinern|2|A|C|save:CON||||self=enlarge
Flame Blade|Flammenklinge|2|B|C|atk|3d6|fire||up2
Flaming Sphere|Flammenkugel|2|A|CH|save:DEX|2d6|fire|1d6|
Heat Metal|Metall erhitzen|2|A|C||2d8|fire|1d8|
Hold Person|Person festhalten|2|A|C|save:WIS||||
Invisibility|Unsichtbarkeit|2|A|C|||||self=invisible
Knock|Klopfen|2|A||||||
Lesser Restoration|Schwache Genesung|2|A||||||
Levitate|Schweben|2|A|C|save:CON||||
Magic Weapon|Magische Waffe|2|B|C|||||
Mirror Image|Spiegelbilder|2|A||||||self=mirrorImage
Misty Step|Nebelschritt|2|B||||||
Moonbeam|Mondstrahl|2|A|CH|save:CON|2d10|radiant|1d10|
Pass without Trace|Spurloses Gehen|2|A|C|||||self=passWithoutTrace
Phantasmal Force|Phantomkraft|2|A|C|save:INT|1d6|psychic||
Prayer of Healing|Heilgebet|2|M||heal|2d8||1d8|mod
Ray of Enfeeblement|Strahl der Schwächung|2|A|C|atk||||
Scorching Ray|Sengender Strahl|2|A||atk|2d6|fire||n=3,n+=1
Shadow Blade|Schattenklinge|2|B|C||2d8|psychic||note
Shatter|Zerbersten|2|A|H|save:CON|3d8|thunder|1d8|
Silence|Stille|2|A|CR|||||
Spider Climb|Spinnenklettern|2|A|C|||||
Spike Growth|Dornenwuchs|2|A|C||2d4|piercing||
Spiritual Weapon|Spirituelle Waffe|2|B||atk|1d8|force||mod,up2
Suggestion|Einflüsterung|2|A|C|save:WIS||||
Web|Netz|2|A|C|save:DEX||||
Animate Dead|Tote beleben|3|M||||||
Aura of Vitality|Aura der Lebenskraft|3|A|C|heal|2d6|||
Bestow Curse|Fluch auferlegen|3|A|C|save:WIS||||
Blinding Smite|Blendender Schlag|3|B|C||3d8|radiant||smite
Call Lightning|Blitze herbeirufen|3|A|CH|save:DEX|3d10|lightning|1d10|
Conjure Animals|Tiere beschwören|3|A|C|||||
Counterspell|Gegenzauber|3|R||||||
Crusader's Mantle|Mantel des Kreuzfahrers|3|A|C||1d4|radiant||self=crusader
Daylight|Tageslicht|3|A||||||
Dispel Magic|Magie bannen|3|A||||||
Fear|Furcht|3|A|C|save:WIS||||
Fireball|Feuerball|3|A|H|save:DEX|8d6|fire|1d6|
Fly|Fliegen|3|A|C|||||self=fly
Gaseous Form|Gasförmige Gestalt|3|A|C|||||
Haste|Hast|3|A|C|||||self=haste
Hunger of Hadar|Hunger Hadars|3|A|C||2d6|cold||
Hypnotic Pattern|Hypnotisches Muster|3|A|C|save:WIS||||
Lightning Arrow|Blitzpfeil|3|B|H|save:DEX|4d8|lightning|1d8|smite
Lightning Bolt|Blitz|3|A|H|save:DEX|8d6|lightning|1d6|
Mass Healing Word|Massen-Heilendes Wort|3|B||heal|1d4||1d4|mod
Remove Curse|Fluch brechen|3|A||||||
Revivify|Wiederbeleben|3|A||||||
Sleet Storm|Schneeregensturm|3|A|C|||||
Slow|Verlangsamen|3|A|C|save:WIS||||
Spirit Guardians|Schutzgeister|3|A|CH|save:WIS|3d8|radiant|1d8|
Stinking Cloud|Stinkende Wolke|3|A|C|save:CON||||
Tongues|Zungen|3|A||||||
Vampiric Touch|Vampirgriff|3|A|C|atk|3d6|necrotic|1d6|
Banishment|Verbannung|4|A|C|save:CHA||||
Blight|Pesthauch|4|A|H|save:CON|8d8|necrotic|1d8|
Confusion|Verwirrung|4|A|C|save:WIS||||
Death Ward|Todesschutz|4|A||||||
Dimension Door|Dimensionstür|4|A||||||
Fire Shield|Feuerschild|4|A||||||
Freedom of Movement|Bewegungsfreiheit|4|A||||||
Greater Invisibility|Mächtige Unsichtbarkeit|4|A|C|||||self=invisible
Guardian of Faith|Wächter des Glaubens|4|A||save:DEX|20|radiant||
Ice Storm|Eissturm|4|A|H|save:DEX|2d8+4d6|cold|1d8|
Polymorph|Verwandlung|4|A|C|save:WIS||||
Staggering Smite|Taumelnder Schlag|4|B|C||4d6|psychic||smite
Stoneskin|Steinhaut|4|A|C|||||
Wall of Fire|Feuerwand|4|A|CH|save:DEX|5d8|fire|1d8|
Animate Objects|Gegenstände beleben|5|A|C|||||
Banishing Smite|Bannender Schlag|5|B|C||5d10|force||smite
Cloudkill|Todeswolke|5|A|CH|save:CON|5d8|poison|1d8|
Cone of Cold|Kältekegel|5|A|H|save:CON|8d8|cold|1d8|
Destructive Wave|Zerstörerische Welle|5|A|H|save:CON|5d6+5d6|thunder||
Flame Strike|Flammenschlag|5|A|H|save:DEX|4d6+4d6|fire|1d6|
Greater Restoration|Mächtige Genesung|5|A||||||
Dominate Person|Person beherrschen|5|A|C|save:WIS||||
Hold Monster|Monster festhalten|5|A|C|save:WIS||||
Insect Plague|Insektenplage|5|A|CH|save:CON|4d10|piercing|1d10|
Mass Cure Wounds|Massen-Wunden heilen|5|A||heal|3d8||1d8|mod
Raise Dead|Tote erwecken|5|M||||||
Steel Wind Strike|Stahlwindschlag|5|A||atk|6d10|force||
Synaptic Static|Synaptische Störung|5|A|H|save:INT|8d6|psychic||
Telekinesis|Telekinese|5|A|C|||||
Wall of Force|Energiewand|5|A|C|||||
Chain Lightning|Kettenblitz|6|A|H|save:DEX|10d8|lightning||
Circle of Death|Todeskreis|6|A|H|save:CON|8d6|necrotic|2d6|
Disintegrate|Auflösung|6|A||save:DEX|10d6+40|force|3d6|
Globe of Invulnerability|Kugel der Unverwundbarkeit|6|A|C|||||
Harm|Leid|6|A|H|save:CON|14d6|necrotic||
Heal|Heilung|6|A||heal|70||10|
Mass Suggestion|Massen-Einflüsterung|6|A||save:WIS||||
Otto's Irresistible Dance|Ottos unwiderstehlicher Tanz|6|A|C|||||
Sunbeam|Sonnenstrahl|6|A|CH|save:CON|6d8|radiant||
True Seeing|Wahrer Blick|6|A||||||
Delayed Blast Fireball|Verzögerter Feuerball|7|A|CH|save:DEX|12d6|fire|1d6|
Finger of Death|Finger des Todes|7|A|H|save:CON|7d8+30|necrotic||
Fire Storm|Feuersturm|7|A|H|save:DEX|7d10|fire||
Forcecage|Energiekäfig|7|A||||||
Plane Shift|Ebenenwechsel|7|A||save:CHA||||
Prismatic Spray|Prismatischer Sprühregen|7|A|H|save:DEX|10d6|var||
Regenerate|Regeneration|7|M||heal|4d8+15|||
Resurrection|Auferstehung|7|M||||||
Teleport|Teleportieren|7|A||||||
Dominate Monster|Monster beherrschen|8|A|C|save:WIS||||
Earthquake|Erdbeben|8|A|C|||||
Feeblemind|Schwachsinn|8|A||save:INT|4d6|psychic||
Holy Aura|Heilige Aura|8|A|C|||||self=holyAura
Incendiary Cloud|Brandwolke|8|A|CH|save:DEX|10d8|fire||
Power Word Stun|Machtwort: Betäubung|8|A||||||
Sunburst|Sonnenexplosion|8|A|H|save:CON|12d6|radiant||
Foresight|Vorahnung|9|M||||||self=foresight
Mass Heal|Massenheilung|9|A||heal|700|||
Meteor Swarm|Meteorschwarm|9|A|H|save:DEX|20d6+20d6|fire||
Power Word Kill|Machtwort: Tod|9|A||||||
Time Stop|Zeitstopp|9|A||||||
True Resurrection|Wahre Auferstehung|9|M||||||
Wish|Wunsch|9|A||||||
`;

/* Alternative Namen (u. a. aus dem DND5e Creator) */
window.CM_SPELL_ALIAS = {
  'Giftsprühen': 'poison_spray', 'Leitung': 'guidance', 'Tote stabilisieren': 'spare_the_dying', 'Boshafter Spott': 'vicious_mockery',
  'Schauriger Strahl': 'eldritch_blast', 'Verkleiden': 'disguise_self', 'Gutbeere': 'goodberry', 'Tiere besprechen': 'speak_with_animals',
  'Arme von Hadar': 'arms_of_hadar', 'Hexenpfeil': 'witch_bolt', 'Jägermal': 'hunter_s_mark', 'Hilfe': 'aid',
  'Schwache Wiederherstellung': 'lesser_restoration', 'Geistige Wächter': 'spirit_guardians', 'Totenerweckung': 'raise_dead',
  'Desintegration': 'disintegrate', 'Teleportation': 'teleport', 'Wort der Macht: Betäubung': 'power_word_stun', 'Wort der Macht: Tod': 'power_word_kill',
  'Lichter tanzen': 'dancing_lights', 'Göttliche Gunst': 'divine_favor', 'Sengender Strahl': 'scorching_ray'
};
