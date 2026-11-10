#!/usr/bin/env python3
"""Prépare les captures de screens_history/ : métadonnées retirées, conversion en webp, renommage AAAAMMJJTHHMMSS.webp.

La date vient du nom d'origine (« Capture d'écran 2026-10-24 173408.png »), sinon de la date de modification du fichier.
Les sources sont supprimées, ainsi que les fichiers « :Zone.Identifier » de Windows. Appelé par .githooks/pre-commit.
Code de sortie 0 ; affiche les fichiers créés (un par ligne) pour que le hook sache s'il y a du nouveau.
"""
import re, sys, datetime
from pathlib import Path
from PIL import Image

DOSSIER = Path(__file__).resolve().parent.parent / 'screens_history'
DEJA_RANGE = re.compile(r'^\d{8}T\d{6}(-\d+)?\.webp$')
DATE_DANS_NOM = re.compile(r'(\d{4})-(\d{2})-(\d{2})[ _T-]+(\d{2})[h:.]?(\d{2})[m:.]?(\d{2})')

def horodatage(f):
    m = DATE_DANS_NOM.search(f.name)
    if m:
        return datetime.datetime(*map(int, m.groups()))
    return datetime.datetime.fromtimestamp(f.stat().st_mtime)

def main():
    if not DOSSIER.is_dir():
        return
    for z in DOSSIER.glob('*Zone.Identifier'):
        z.unlink()
    for f in sorted(DOSSIER.iterdir()):
        if not f.is_file() or f.name.startswith('.') or DEJA_RANGE.match(f.name):
            continue
        if f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'):
            continue
        base = horodatage(f).strftime('%Y%m%dT%H%M%S')
        cible, n = DOSSIER / f'{base}.webp', 1
        while cible.exists():
            n += 1
            cible = DOSSIER / f'{base}-{n}.webp'
        with Image.open(f) as im:
            im.load()
            # Nouvelle image à partir des pixels seuls : ni EXIF, ni profil, ni texte PNG.
            propre = Image.new(im.mode if im.mode in ('RGB', 'RGBA') else 'RGBA', im.size)
            propre.paste(im.convert(propre.mode))
            propre.save(cible, 'WEBP', quality=90, method=6)
        f.unlink()
        print(cible.relative_to(DOSSIER.parent))

main()
