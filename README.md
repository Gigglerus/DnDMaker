# 🐉 The Ultimate DND5e Maker

Eine Sammlung von Werkzeugen für **Dungeons & Dragons 5. Edition** – für Spielleitung und Spieler, komplett auf Deutsch (der Creator auch auf Englisch).

Jedes Tool ist **eine einzige HTML-Datei**: herunterladen, doppelklicken, loslegen. Keine Installation, kein Server, kein Konto. Alles läuft offline im Browser, und die Daten bleiben lokal auf deinem Rechner (localStorage / IndexedDB).

> **Stand:** 19.11.2026, 21:06:40 Uhr (Version `DnDMaker_2026-11-19_21-06-40`)

---

## Inhalt

- [Schnellstart](#-schnellstart)
- [Die Tools](#-die-tools)
- [Wie die Tools zusammenarbeiten](#-wie-die-tools-zusammenarbeiten)
- [Aufbau des Repositorys](#-aufbau-des-repositorys)
- [Selbst bauen](#-selbst-bauen)
- [Tests](#-tests)
- [Systemvoraussetzungen](#-systemvoraussetzungen)
- [Hinweise](#-hinweise)

---

## 🚀 Schnellstart

**Am einfachsten:** [`tools/DND5e_Maker.html`](tools/DND5e_Maker.html) herunterladen und im Browser öffnen.
Diese Datei enthält die Startseite und **alle sechs Tools** in einem. Über die Leiste oben wechselst du zwischen den Tools, ohne dass eines neu lädt.

**Alternativ – einzelne Dateien:**

1. Den Ordner [`tools/`](tools/) herunterladen (oder das ganze Repository über **Code → Download ZIP**).
2. `DND5e_Startseite.html` öffnen. Sie verlinkt alle Tools im selben Ordner.
3. Oder direkt das gewünschte Tool öffnen – jede Datei läuft auch allein.

> 💡 Die Startseite braucht `landing-config.js` im selben Ordner. Dort lässt sich einstellen, wo die Tools und das *Players Handbook* (PDF) liegen. Pfade können auch im Browser über „⚙️ Ordner einstellen“ geändert werden.

---

## 🧰 Die Tools

| Tool | Datei | Wofür |
|---|---|---|
| 🏠 **Maker (Gesamtpaket)** | [`DND5e_Maker.html`](tools/DND5e_Maker.html) | Startseite und alle Tools in einer Datei. Braucht keine weiteren Dateien. |
| 🏠 **Startseite** | [`DND5e_Startseite.html`](tools/DND5e_Startseite.html) | Übersicht mit Links zu allen Tools und zum Players Handbook. |
| 🧙 **Creator** | [`the-ultimate-dnd5e-creator.html`](tools/the-ultimate-dnd5e-creator.html) | Charaktererstellung Schritt für Schritt |
| 📜 **Charakterverwaltung** | [`DND5e_Charakterverwaltung.html`](tools/DND5e_Charakterverwaltung.html) | Charaktere im Spiel führen |
| ⚔️ **Encounter Builder** | [`DND5e_Encounter_Builder.html`](tools/DND5e_Encounter_Builder.html) | Begegnungen bauen und auswürfeln |
| 🗺️ **Kartenschmiede** | [`DND5e_Kartenschmiede.html`](tools/DND5e_Kartenschmiede.html) | Land- und Stadtkarten erschaffen |
| 🌍 **Atlas** | [`DND5e_Atlas.html`](tools/DND5e_Atlas.html) | Bestehende Weltkarten mit Leben füllen |
| 📖 **Sessionverwaltung** | [`DND5e_Sessionverwaltung.html`](tools/DND5e_Sessionverwaltung.html) | Kampagnen und Spielabende planen |

### 🧙 Creator
Charaktererstellung nach den 5e-Regeln, Schritt für Schritt.
- Alle 12 Klassen, Völker, Hintergründe, Ausrüstung, Zauber
- Ausfüllbarer **PDF-Charakterbogen** – und das PDF lässt sich wieder einlesen
- Begleiter, Glossar, Aufleveln bis Stufe 20
- Deutsch und Englisch

### 📜 Charakterverwaltung
Charaktere aus dem Creator-PDF importieren und **Runde für Runde im Kampf** führen.
- Aktionen, Bonusaktionen und Reaktionen (mit Hinweis, wann eine Reaktion ausgelöst werden kann)
- Zauberplätze, Zauber vorbereiten nach der langen Rast
- Klassenfähigkeiten wie „Göttliche Macht fokussieren“ mit den Optionen des Schwurs bzw. der Domäne
- ℹ️-Erklärungen, wie jeder Wert berechnet wird

### ⚔️ Encounter Builder
- Begegnungen zusammenstellen, Schwierigkeit nach dem *Dungeon Master's Guide*
- Kampfansicht mit Initiative und Würfeln
- Übernimmt Begegnungen und Boss-NSCs direkt aus der Sessionverwaltung

### 🗺️ Kartenschmiede
Eigene Landkarten erschaffen.
- Land frei malen oder als Kontinent, Archipel oder Gebirge erzeugen
- Gelände, Flüsse, Seen, Straßen (mit automatischen Brücken) und Städte für alle Völker
- Ebene **„Reiche“**: Königreiche, Fürstentümer, Grafschaften … einfärben, mit Grenzen und Namen
- **Stadtkarten** je Stadt: zufällig erzeugen oder selbst zeichnen (Läden, Schänken, Rathaus, Palast …)
- Drei Render-Stile: Realistisch, Künstlerisch, Gezeichnet
- Export als PNG, JPG, WebP, SVG, PDF oder als Atlas-Projekt

### 🌍 Atlas
Eine vorhandene Weltkarte (JPG, PNG, SVG …) laden und ausbauen.
- **Städte automatisch erkennen**
- Städte mit Völkern, Bevölkerungsdichte, Reichtum, Art, Unterkünften, Restaurants und Geschäften ausstatten
- Läden & Orte (**Points of Interest**) je Stadt anlegen und auswürfeln
- Beschriftungen in wählbarer Schrift und Größe
- Stadtkarten mit anklickbaren PoI-Markern

### 📖 Sessionverwaltung
Die Zentrale für die Spielleitung.
- Kampagnen, Sessions und Session-Notizen
- Charakterbögen (PDF) mit Notizen, **Schnell-NSCs** und **Boss-NSCs** mit eigenem Werteblock
- Points of Interest mit Waren und Preisen (abhängig von Stil, Umgebung und Reichtum der Stadt)
- Karte mit Markern, **Questlog** (NSCs als Infogeber, Verbündete, Verdächtige … zuordnen)
- Reiter **„🕸️ Beziehungen“**: Mindmap mit Gruppen (Königreiche, Gilden, Banden, Orden …) und farbigen Beziehungspfeilen (verbündet, gut, bekannt, schlecht, verfeindet)
- „⚔️ Begegnung starten“ öffnet den Encounter Builder direkt im Kampf

---

## 🔗 Wie die Tools zusammenarbeiten

```
 Creator ──PDF──▶ Charakterverwaltung
    │
    └──PDF──▶ Sessionverwaltung ──Begegnung starten──▶ Encounter Builder
                    ▲      │
        Atlas-Datei │      │ Als Atlas-Datei
                    │      ▼
 Kartenschmiede ──Atlas-Projekt──▶ Atlas
```

- **Charaktere** wandern als PDF-Charakterbogen vom Creator in die Charakterverwaltung und die Sessionverwaltung.
- **Karten, Städte und Points of Interest** nutzen in Kartenschmiede, Atlas und Sessionverwaltung dasselbe Datenmodell und lassen sich hin und her übergeben.
- **Begegnungen** aus der Sessionverwaltung starten direkt im Encounter Builder – mit den anwesenden Charakteren und Boss-NSCs.
- Im **Maker** passiert der Wechsel zwischen den Tools innerhalb einer Datei; gespeicherte Daten sind dieselben wie bei den Einzeldateien.

---

## 📁 Aufbau des Repositorys

```
DnDMaker/
├── README.md
├── CHANGELOG.md                Releasenotes aller Versionen
├── index.html                  Download-Zentrale (Übersichtsseite mit Einzel- und ZIP-Download)
├── manifest.json               Liste aller Dateien mit Beschreibung (DE/EN), Größe und Stand
└── tools/
    ├── DND5e_Maker.html                  ⭐ alles in einer Datei
    ├── DND5e_Startseite.html
    ├── landing-config.js                 Einstellungen der Startseite
    ├── the-ultimate-dnd5e-creator.html
    ├── DND5e_Charakterverwaltung.html
    ├── DND5e_Encounter_Builder.html
    ├── DND5e_Kartenschmiede.html
    ├── DND5e_Atlas.html
    ├── DND5e_Sessionverwaltung.html
    ├── Creator_Testprogramm.txt          Node.js-Test für den Creator
    ├── Atlas_Quellcode/                  ┐
    ├── Charakterverwaltung_Quellcode/    │ Quellcode, Build-Skript
    ├── Kartenschmiede_Quellcode/         │ und Tests der Tools
    ├── Maker_Quellcode/                  │
    └── Sessionverwaltung_Quellcode/      ┘
```

Jeder `*_Quellcode`-Ordner ist gleich aufgebaut:

| Pfad | Inhalt |
|---|---|
| `build.py` | setzt die Quelldateien zu einer einzigen HTML-Datei zusammen |
| `src/` | JavaScript, CSS und HTML-Vorlagen |
| `test/` | Browser-Tests (Node.js + Playwright), teils mit Testdaten |
| `LIESMICH.txt` | Kurzbeschreibung der Dateien (wo vorhanden) |

> Für **Creator**, **Startseite** und **Encounter Builder** liegt derzeit nur die fertige HTML-Datei vor, kein getrennter Quellcode.

---

## 🔨 Selbst bauen

Voraussetzung: **Python 3** (keine weiteren Pakete nötig).

```bash
cd tools/Atlas_Quellcode
python build.py          # → DND5e_Atlas.html
```

Genauso für die anderen Tools:

| Ordner | Befehl | Ergebnis |
|---|---|---|
| `Atlas_Quellcode` | `python build.py` | `DND5e_Atlas.html` |
| `Charakterverwaltung_Quellcode` | `python build.py` | `DND5e_Charakterverwaltung.html` |
| `Kartenschmiede_Quellcode` | `python build.py` | `DND5e_Kartenschmiede.html` |
| `Sessionverwaltung_Quellcode` | `python build.py` | `DND5e_Sessionverwaltung.html` |
| `Maker_Quellcode` | `python build.py <Tool-Ordner> <Zieldatei>` | `DND5e_Maker.html` |

Die Datei entsteht jeweils im Quellcode-Ordner. Danach die neue HTML-Datei nach `tools/` kopieren.

**Maker neu bauen** (nach jeder Änderung an einem Tool):

```bash
cd tools/Maker_Quellcode
python build.py .. ../DND5e_Maker.html
```

Liegt `manifest.json` im Tool-Ordner, übernimmt der Maker daraus die Stände der Tools und zeigt sie in den Einstellungen an.

---

## 🧪 Tests

Die Tests unter `test/` laufen mit **Node.js** und **Playwright**:

```bash
npm install playwright
npx playwright install chromium
node test/t1.js
```

> ⚠️ Einige Tests enthalten noch absolute Pfade aus der Entwicklungsumgebung (z. B. `/home/claude/atlas`). Diese vor dem Start auf den eigenen Pfad anpassen.

**Creator-Testprogramm:** `Creator_Testprogramm.txt` in `.js` umbenennen und starten:

```bash
node Creator_Testprogramm.js the-ultimate-dnd5e-creator.html
```

Es prüft alle 12 Klassen mit mehreren Völkern und Stufen, die PDF-Erzeugung, das Einlesen, das Aufleveln und das Bearbeiten.

---

## 💻 Systemvoraussetzungen

- Ein aktueller Browser: **Chrome, Edge oder Firefox** (Windows 11 getestet)
- Keine Installation, keine Internetverbindung nötig – Schriften und Bibliotheken sind eingebettet
- Nur die Download-Zentrale (`index.html`) lädt JSZip und Schriften aus dem Internet

---

## 📝 Hinweise

- **Daten** werden im Browser gespeichert (localStorage / IndexedDB). Wer den Browser-Cache leert, verliert sie – wichtige Charaktere, Karten und Kampagnen daher regelmäßig exportieren.
- `landing-config.js` enthält einen Ausweichpfad für Windows (`fallbackFolder`). Bei Bedarf auf den eigenen Ordner anpassen.
- Die Download-Zentrale (`index.html`) funktioniert auch über **GitHub Pages**: in den Repository-Einstellungen unter *Pages* den Branch `main` als Quelle wählen.
- *Dungeons & Dragons* ist eine Marke von Wizards of the Coast. Dieses Projekt ist ein privates Fan-Projekt und steht in keiner Verbindung zu Wizards of the Coast. Regeltexte und das *Players Handbook* sind nicht enthalten.
