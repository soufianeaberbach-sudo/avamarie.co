import hashlib
import importlib.util
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parent.parent
BASE = '24e7365'

def original(path):
    return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=ROOT)

def manifest():
    return {str(p.relative_to(ROOT / 'dist')): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (ROOT / 'dist').rglob('*') if p.is_file()}

class SiteRegression(unittest.TestCase):
    def test_build_reproducible(self):
        subprocess.run(['npm', 'run', 'build'], cwd=ROOT, check=True, capture_output=True)
        before = manifest()
        generated = {p: (ROOT / p / 'index.html').read_bytes() for p in ['contact','portfolio','our-story','manufacturing','services','partners']}
        subprocess.run(['npm', 'run', 'build'], cwd=ROOT, check=True, capture_output=True)
        self.assertEqual(before, manifest())
        self.assertTrue(all(v == (ROOT / p / 'index.html').read_bytes() for p, v in generated.items()))

    def test_page_metadata_navigation_and_layout_unchanged(self):
        files = ['index.html'] + [p+'/index.html' for p in ['contact','portfolio','our-story','manufacturing','services','partners']]
        for file in files:
            old = original(file).decode(); new = (ROOT / file).read_text()
            with self.subTest(file=file):
                self.assertEqual(old.split('</head>')[0], new.split('</head>')[0])
                for pattern in [r'<nav\b.*?</nav>', r'<style>.*?</style>', r'let current=\'.*?\';', r'<section[^>]*>', r'<footer>.*?</footer>']:
                    self.assertEqual(re.findall(pattern,re.sub(r'<noscript>.*?</noscript>', '', old, flags=re.S),re.S), re.findall(pattern,re.sub(r'<noscript>.*?</noscript>', '', new, flags=re.S),re.S))
                self.assertIn('action="/api/contact"',new)
                self.assertIn('src="/js/contact.js"',new)
                self.assertNotIn('data-netlify',new)
                self.assertNotIn('function submitForm(',new)

    def test_all_preexisting_public_files_preserved(self):
        changed = {'index.html'} | {p+'/index.html' for p in ['contact','portfolio','our-story','manufacturing','services','partners']}
        paths = subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines()
        private = {'.gitignore','scripts/build.py','wrangler.jsonc','netlify.toml'}
        for path in paths:
            with self.subTest(path=path):
                if path in private:
                    self.assertFalse((ROOT/'dist'/path).exists())
                elif path not in changed:
                    self.assertEqual(original(path), (ROOT/'dist'/path).read_bytes())
        self.assertEqual(original('scripts/build.py'),(ROOT/'scripts/build.py').read_bytes())
        self.assertEqual(original('netlify.toml'),(ROOT/'netlify.toml').read_bytes())

    def test_staging_rejects_hidden_files_and_symlinks(self):
        spec=importlib.util.spec_from_file_location('stager',ROOT/'scripts/stage_assets.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        for name in ['js/.env','js/secret.ts']:
            path=ROOT/name
            try:
                path.write_text('test fixture')
                with self.assertRaises(ValueError):module.stage()
            finally:path.unlink()
        path=ROOT/'js/linked.js'
        try:
            path.symlink_to(ROOT/'worker/index.js')
            with self.assertRaises(ValueError):module.stage()
        finally:path.unlink()
        module.stage()

if __name__ == '__main__': unittest.main()
