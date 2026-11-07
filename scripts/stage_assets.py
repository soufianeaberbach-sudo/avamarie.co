#!/usr/bin/env python3
"""Stage only the existing public site. Never publish the repository root.

New public directories must be deliberately added here. Hidden files and symlinks
are rejected, including within a public directory; local secrets cannot hitch a ride.
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = [
    'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'erp.html', 'login.html',
    'AVA MARIE', 'LOGO', 'Manufacturing', 'admin', 'contact', 'css', 'img',
    'index', 'js', 'manufacturing', 'our-story', 'partners', 'portfolio',
    'services', 'views',
]
# Public assets have known formats. Do not accidentally publish a backup/source/env file.
EXTENSIONS = {'.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp',
              '.jfif', '.mp4', '.pdf', '.woff', '.woff2', '.ico', '.txt', '.xml'}


def stage():
    out = ROOT / 'dist'
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    for entry in PUBLIC:
        source = ROOT / entry
        paths = sorted(source.rglob('*')) if source.is_dir() else [source]
        for path in paths:
            rel = path.relative_to(ROOT)
            if path.is_symlink() or any(p.startswith('.') for p in rel.parts):
                raise ValueError(f'Unsafe public asset: {rel}')
            if path.is_dir():
                continue
            if path.suffix.lower() not in EXTENSIONS:
                raise ValueError(f'Unreviewed public asset format: {rel}')
            target = out / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
    print('Staged public assets in dist/')


if __name__ == '__main__':
    stage()
