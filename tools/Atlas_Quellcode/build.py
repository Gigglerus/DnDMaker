import os
root = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(root, 'src', f), encoding='utf-8').read()
fonts = open(os.path.join(root, 'fonts_eb.css'), encoding='utf-8').read()
js = src('data.js') + '\n' + src('detect.js') + '\n' + src('app.js').replace('/*ORN*/', src('orn.js')).replace('/*POI*/', src('poi.js').replace('/*POIKINDS*/', src('poikinds.js'))).replace('/*LABELS*/', src('labels.js'))
html = ('<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>The Ultimate DND5e Atlas</title>\n<style>' + fonts + '\n' + src('style.css') + '</style>\n</head>\n<body>\n<div id="app"></div>\n<script>'
        + js.replace('</script', '<\\/script') + '</script>\n</body>\n</html>\n')
out = os.path.join(root, 'DND5e_Atlas.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html) // 1024, 'KB')
