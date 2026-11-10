#!/usr/bin/env python3
"""Prepares the screenshots of screens_history/: metadata removed, converted to webp, renamed YYYYMMDDTHHMMSS.webp.

The date comes from the original name (« Capture d'écran 2026-10-24 173408.png »), otherwise from the file's modification date.
The sources are deleted, as well as Windows « :Zone.Identifier » files. Called by .githooks/pre-commit.
Exit code 0; prints the files created (one per line) so that the hook knows whether there is anything new.
"""
import re, sys, datetime
from pathlib import Path
from PIL import Image

FOLDER = Path(__file__).resolve().parent.parent / 'screens_history'
ALREADY_FILED = re.compile(r'^\d{8}T\d{6}(-\d+)?\.webp$')
DATE_IN_NAME = re.compile(r'(\d{4})-(\d{2})-(\d{2})[ _T-]+(\d{2})[h:.]?(\d{2})[m:.]?(\d{2})')

def timestamp_of(f):
    m = DATE_IN_NAME.search(f.name)
    if m:
        return datetime.datetime(*map(int, m.groups()))
    return datetime.datetime.fromtimestamp(f.stat().st_mtime)

def main():
    if not FOLDER.is_dir():
        return
    for z in FOLDER.glob('*Zone.Identifier'):
        z.unlink()
    for f in sorted(FOLDER.iterdir()):
        if not f.is_file() or f.name.startswith('.') or ALREADY_FILED.match(f.name):
            continue
        if f.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'):
            continue
        base = timestamp_of(f).strftime('%Y%m%dT%H%M%S')
        target, n = FOLDER / f'{base}.webp', 1
        while target.exists():
            n += 1
            target = FOLDER / f'{base}-{n}.webp'
        with Image.open(f) as im:
            im.load()
            # New image built from the pixels alone: no EXIF, no profile, no PNG text.
            clean = Image.new(im.mode if im.mode in ('RGB', 'RGBA') else 'RGBA', im.size)
            clean.paste(im.convert(clean.mode))
            clean.save(target, 'WEBP', quality=90, method=6)
        f.unlink()
        print(target.relative_to(FOLDER.parent))

main()
