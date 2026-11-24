import base64, os, sys
root = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(root, 'src', f), encoding='utf-8').read()
fonts_css = open(os.path.join(root, 'fonts_eb.css'), encoding='utf-8').read() + '\n' if os.path.exists(os.path.join(root, 'fonts_eb.css')) else ''
fdir = os.path.join(root, 'fonts')
FONT_MAP = [('CMTitle', 'title'), ('CMKicker', 'kicker'), ('CMBody', 'body'), ('CMBody', 'body-italic'), ('CMBody', 'body-bold')]
if os.path.isdir(fdir):
    for fam, stem in FONT_MAP:
        for ext, fmt in (('woff2', 'woff2'), ('woff', 'woff'), ('ttf', 'truetype'), ('otf', 'opentype')):
            p = os.path.join(fdir, stem + '.' + ext)
            if os.path.exists(p):
                b64 = base64.b64encode(open(p, 'rb').read()).decode()
                style = 'italic' if 'italic' in stem else 'normal'
                weight = '700' if 'bold' in stem else '400'
                fonts_css += "@font-face{font-family:'%s';src:url(data:font/%s;base64,%s) format('%s');font-style:%s;font-weight:%s;font-display:swap}\n" % (fam, ext, b64, fmt, style, weight)
                break
js = '\n'.join(src(f) for f in ['pdfform.js', 'spells.js', 'data.js', 'rules.js', 'import.js', 'app_core.js', 'app_play.js', 'app_ui.js', 'app_panel.js', 'app_info.js', 'app_events.js'])
html = src('index.html').replace('/*FONTS*/', fonts_css).replace('/*CSS*/', src('style.css')).replace('/*JS*/', js.replace('</script', '<\\/script'))
out = os.path.join(root, 'DND5e_Charakterverwaltung.html')
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html) // 1024, 'KB')
