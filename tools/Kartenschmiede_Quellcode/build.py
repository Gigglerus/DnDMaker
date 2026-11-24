#!/usr/bin/env python3
"""Baut DND5e_Kartenschmiede.html (eine Datei, offline) aus src/."""
import pathlib
R = pathlib.Path(__file__).parent
s = lambda n: (R / 'src' / n).read_text(encoding='utf-8')
js = "(function () {\n'use strict';\n" + s('orn.js') + '\n' + s('core.js') + '\n' + s('render.js') + '\n' + s('realm.js') + '\n' + s('poikinds.js') + '\n' + s('city.js') + '\n' + s('cityui.js') + '\n' + s('ui.js') + '\n})();'
html = ('<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>The Ultimate DND5e Kartenschmiede</title>\n<style id="fontcss">' + s('fonts.css') + '</style>\n<style>' + s('base.css') + s('style.css') + '</style>\n</head>\n<body>\n<div id="app"></div>\n<script>'
        + js.replace('</script', '<\\/script') + '</script>\n</body>\n</html>\n')
out = R / 'DND5e_Kartenschmiede.html'
out.write_text(html, encoding='utf-8')
print(out, len(html.encode('utf-8')), 'Bytes')
