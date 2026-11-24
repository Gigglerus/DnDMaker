// Einstellungen für die Startseite "DND5e_Startseite.html"
// Hier kannst du festlegen, wo die Tools liegen.
// Diese Werte gelten als Standard. Im Browser kannst du sie über "⚙️ Ordner einstellen" jederzeit überschreiben.
//
// folder:         Basisordner der Tools. Leer lassen = derselbe Ordner wie die Startseite.
// fallbackFolder: Wird automatisch ausprobiert, wenn ein Tool im Basisordner nicht gefunden wird
//                 (z. B. wenn die Startseite als Kopie aus einem anderen Ordner geöffnet wurde).
//                 Backslashes doppelt schreiben!
// tools:          Dateiname oder Pfad der jeweiligen Startdatei (relativ zum Basisordner oder absolut).

window.DND_LANDING_CONFIG = {
  folder: '',
  fallbackFolder: 'C:\\Users\\justi\\OneDrive\\Desktop\\DND\\DnDMaker',
  tools: {
    creator: 'the-ultimate-dnd5e-creator.html',
    manager: 'DND5e_Charakterverwaltung.html',
    encounter: 'DND5e_Encounter_Builder.html',
    forge: 'DND5e_Kartenschmiede.html',
    world: 'DND5e_Atlas.html',
    session: 'DND5e_Sessionverwaltung.html'
  },
  // Players Handbook (PDF): relativ zur Startseite ('..\\' = ein Ordner höher) oder absolut.
  // Wird es dort nicht gefunden, sucht die Startseite im eigenen Ordner und danach unter phbFallback.
  phb: '..\\D&D 5e - Players Handbook.pdf',
  phbFallback: 'C:\\Users\\justi\\OneDrive\\Desktop\\DND\\D&D 5e - Players Handbook.pdf'
};
