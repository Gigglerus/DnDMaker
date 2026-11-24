#!/usr/bin/env python3
"""Baut DND5e_Maker.html: Startseite + alle Tools in EINER Datei.

Aufruf:  python build.py [Ordner mit den Tool-HTMLs] [Zieldatei]
Standard: Ordner "tools" neben diesem Skript, Ziel "DND5e_Maker.html".

Liegt im Tool-Ordner eine manifest.json der Download-Zentrale, werden daraus
die Stände ("updated") der Tools übernommen und in den Einstellungen angezeigt.
Nach jeder Änderung an einem der Tools einfach neu bauen.
"""
import json, os, re, sys
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
TOOLS = [  # Kennung (wie auf der Startseite) → Datei
    ('creator', 'the-ultimate-dnd5e-creator.html'),
    ('manager', 'DND5e_Charakterverwaltung.html'),
    ('encounter', 'DND5e_Encounter_Builder.html'),
    ('forge', 'DND5e_Kartenschmiede.html'),
    ('world', 'DND5e_Atlas.html'),
    ('session', 'DND5e_Sessionverwaltung.html'),
]
HOOK = ('<script>(function(){try{var P=window.parent;'
        'if(P&&P!==window&&P.DNDMaker)P.DNDMaker.hook(window,"%s");}catch(e){}})();</script>')


def js_literal(obj):
    """JSON, das gefahrlos in einem <script>-Block stehen kann."""
    s = json.dumps(obj, ensure_ascii=False)
    return (s.replace('</', '<\\/').replace('<!--', '<\\!--')
             .replace('\u2028', '\\u2028').replace('\u2029', '\\u2029'))


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def main():
    tool_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'tools')
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'DND5e_Maker.html')
    stamps = {}
    mf = os.path.join(tool_dir, 'manifest.json')
    if os.path.exists(mf):
        stamps = {t['file']: t.get('updated', '') for t in json.loads(read(mf)).get('tools', [])}

    tools = {}
    for tid, fn in TOOLS:
        path = os.path.join(tool_dir, fn)
        if not os.path.exists(path):
            sys.exit('FEHLT: ' + path)
        html = read(path)
        # Start-Skript direkt hinter <meta charset> einsetzen: läuft vor dem Code des Tools
        html, n = re.subn(r'(<meta charset=["\']?utf-?8["\']?\s*/?>)', lambda m: m.group(1) + HOOK % tid, html, count=1, flags=re.I)
        if n != 1:
            sys.exit('Kein <meta charset> gefunden in ' + fn)
        tools[tid] = {'file': fn, 'updated': stamps.get(fn, ''), 'html': html}
        print('  %-10s %-36s %8d Zeichen  %s' % (tid, fn, len(html), stamps.get(fn, '')))

    now = datetime.now(timezone(timedelta(hours=1)))  # Europe/Berlin (Winterzeit)
    build = {'built': os.environ.get('MAKER_BUILT') or now.strftime('%Y-%m-%dT%H:%M:%S+01:00')}
    shell = read(os.path.join(SRC, 'shell.html'))
    for mark, val in (('/*__FONTS__*/', read(os.path.join(SRC, 'fonts.css'))),
                      ('/*__BUILD__*/null', js_literal(build)),
                      ('/*__TOOLS__*/{}', js_literal(tools))):
        if shell.count(mark) != 1:
            sys.exit('Platzhalter fehlt oder doppelt: ' + mark)
        shell = shell.replace(mark, val)
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(shell)
    print('OK  %s  (%d Byte, gebaut %s)' % (out, os.path.getsize(out), build['built']))


if __name__ == '__main__':
    main()
