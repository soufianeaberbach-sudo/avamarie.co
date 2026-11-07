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
                # Only the retired third-party script may disappear from the head.
                old_head = re.sub(r'<script src="https://identity\.netlify\.com/[^"]+"></script>\n', '', old.split('</head>')[0])
                self.assertEqual(old_head, new.split('</head>')[0])
                for pattern in [r'<nav\b.*?</nav>', r'<style>.*?</style>', r'let current=\'.*?\';', r'<section[^>]*>', r'<footer>.*?</footer>']:
                    self.assertEqual(re.findall(pattern,re.sub(r'<noscript>.*?</noscript>', '', old, flags=re.S),re.S), re.findall(pattern,re.sub(r'<noscript>.*?</noscript>', '', new, flags=re.S),re.S))
                self.assertIn('action="/api/contact"',new)
                self.assertIn('src="/js/contact.js"',new)
                self.assertNotRegex(new.lower(), r'netlify|gotrue')
                self.assertNotIn('function submitForm(',new)

    def test_all_preexisting_public_files_preserved(self):
        changed = {'index.html'} | {p+'/index.html' for p in ['contact','portfolio','our-story','manufacturing','services','partners']}
        paths = subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=ROOT,text=True).splitlines()
        private = {path for path in paths if path.startswith('.') or Path(path).suffix in {'.py', '.jsonc', '.toml'}}
        for path in paths:
            with self.subTest(path=path):
                if path in private:
                    self.assertFalse((ROOT/'dist'/path).exists())
                elif path not in changed:
                    self.assertEqual(original(path), (ROOT/'dist'/path).read_bytes())
        self.assertEqual(original('scripts/build.py'),(ROOT/'scripts/build.py').read_bytes())


    def test_cloudflare_only_repository_and_staged_assets(self):
        # Documentation may contain factual migration history; executable files
        # and dependency manifests may not depend on the retired provider.
        tracked = subprocess.check_output(['git','ls-files'], cwd=ROOT, text=True).splitlines()
        for path in tracked:
            file = ROOT/path
            if not file.exists() or path.startswith('docs/') or path.startswith('tests/'):
                continue
            self.assertNotIn('netlify', path.lower(), path)
            if file.suffix in {'.html','.js','.json','.jsonc','.toml','.py','.yml','.yaml'}:
                self.assertNotRegex(file.read_text().lower(), r'netlify|gotrue', path)
        self.assertFalse((ROOT/'netlify.toml').exists())
        self.assertFalse((ROOT/'dist/netlify.toml').exists())
        for file in (ROOT/'dist').rglob('*'):
            if file.is_file() and file.suffix in {'.html','.js','.css','.json','.xml','.txt'}:
                self.assertNotRegex(file.read_text().lower(), r'netlify|gotrue', str(file))
        config = (ROOT/'wrangler.jsonc').read_text()
        for route in ['/api/*','/admin','/admin/*','/index','/index/']:
            self.assertIn('"'+route+'"', config)
        self.assertIn('"not_found_handling": "404-page"', config)

    def test_generated_pages_exactly_match_source_build(self):
        spec=importlib.util.spec_from_file_location('builder',ROOT/'scripts/build.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        source=(ROOT/'index.html').read_text()
        for page in module.PAGES:
            self.assertEqual(module.build_section_page(source,page), (ROOT/page['dir']/'index.html').read_text())

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
        path=ROOT/'untrusted-public-dir'
        module.PUBLIC.append(path.name)
        try:
            path.symlink_to(ROOT/'js', target_is_directory=True)
            with self.assertRaises(ValueError):module.stage()
        finally:
            path.unlink()
            module.PUBLIC.pop()
        module.stage()

if __name__ == '__main__': unittest.main()
