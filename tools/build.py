#!/usr/bin/env python3
"""Inline Leaflet and the MGRS helper into src/app.html and write the single-file app to index.html."""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'src' / 'app.html').read_text(encoding='utf-8')
for key, rel in (('LEAFLET_CSS', 'vendor/leaflet.css'), ('LEAFLET_JS', 'vendor/leaflet.js'), ('MGRS_JS', 'vendor/mgrs.js')):
    marker = '/*{{%s}}*/' % key
    assert html.count(marker) == 1, marker
    html = html.replace(marker, (root / rel).read_text(encoding='utf-8').replace('</script', '<\\/script'))
(root / 'index.html').write_text(html, encoding='utf-8')
print('wrote index.html (%d KB)' % (len(html) // 1024))
