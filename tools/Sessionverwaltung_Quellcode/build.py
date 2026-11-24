import os
root = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(root, 'src', f), encoding='utf-8').read()
fonts = src('fonts_eb.css')
ui = src('ui.js').replace('/*ORN*/', src('orn.js'))
js = '\n'.join([src('pdfform.js'), src('ebdata.js'), src('gen.js'), src('atlasdata.js'), src('poidata.js'), src('core.js'), ui, src('map.js'), src('events.js'), src('quests.js'), src('poi.js'), src('boss.js'), src('graph.js')])
css = src('style.css') + '\n' + src('extra.css')
html = ('<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>The Ultimate DND5e Sessionverwaltung</title>\n'
        '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Cpolygon points=%2250,3 91,27 91,73 50,97 9,73 9,27%22 fill=%22%236e1a1a%22 stroke=%22%23d4a845%22 stroke-width=%226%22/%3E%3C/svg%3E">\n'
        '<style>' + fonts + '\n' + css + '</style>\n</head>\n<body>\n<div id="app"></div>\n<script>' + js.replace('</script', '<\\/script') + '</script>\n</body>\n</html>\n')
out = os.path.join(root, 'DND5e_Sessionverwaltung.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html) // 1024, 'KB')
