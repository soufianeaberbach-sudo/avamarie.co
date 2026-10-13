#!/usr/bin/env python3
"""
Ava Marie SEO build script.
Generates 6 section entry points from index.html (the single source of truth).

Usage:
    python3 scripts/build.py

Each section page differs from index.html only in head metadata, nav active
state, section active class, and the `let current=` variable. All shared
content (layout, components, JS behaviour) lives in index.html and is
propagated automatically on every build run.

To update shared content: edit index.html, then run this script.
To update per-page metadata: edit the PAGES config below, then run this script.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ─── Per-page configuration ──────────────────────────────────────────────────
# Each entry drives exactly the differences between index.html and that section
# page. The JSON-LD must be a single-line string (no embedded newlines).

HOME_JSON_LD = '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"WebPage","@id":"https://avamarie.co/","url":"https://avamarie.co/","name":"Ava Marie \\u2014 Premium Fashion Manufacturing","description":"Ava Marie is a premium fashion manufacturer in Tangier, Morocco. 250,000+ garments per month for global brands. 40+ years of manufacturing excellence.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"}]}'

HOME_TITLE = 'Ava Marie — Premium Fashion Manufacturing'
HOME_DESC  = 'Ava Marie is a premium fashion manufacturer in Tangier, Morocco. 250,000+ garments per month for global brands. 40+ years of manufacturing excellence.'

PAGES = [
    {
        'slug':    'story',
        'dir':     'our-story',
        'path':    '/our-story/',
        'title':   'Our Story — Ava Marie Manufacturing',
        'desc':    'Discover the story of Ava Marie — a world-class fashion manufacturer in Tangier, Morocco, backed by 40+ years of expertise within the global Sarodiya network.',
        'nav_href':'/our-story/',
        'section': 'pg-story',
        'json_ld': '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"AboutPage","@id":"https://avamarie.co/our-story/","url":"https://avamarie.co/our-story/","name":"Our Story \\u2014 Ava Marie Manufacturing","description":"Discover the story of Ava Marie \\u2014 a world-class fashion manufacturer in Tangier, Morocco, backed by 40+ years of expertise within the global Sarodiya network.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://avamarie.co/"},{"@type":"ListItem","position":2,"name":"Our Story","item":"https://avamarie.co/our-story/"}]}]}',
    },
    {
        'slug':    'journey',
        'dir':     'manufacturing',
        'path':    '/manufacturing/',
        'title':   'Manufacturing Process — Ava Marie',
        'desc':    "Ava Marie’s 10-step manufacturing journey: design, pattern development, sample cutting, precision CAD cutting, sewing, quality finishing and global delivery from two facilities in Tangier, Morocco.",
        'nav_href':'/manufacturing/',
        'section': 'pg-journey',
        'json_ld': '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"WebPage","@id":"https://avamarie.co/manufacturing/","url":"https://avamarie.co/manufacturing/","name":"Manufacturing Process \\u2014 Ava Marie","description":"Ava Marie\'s 10-step manufacturing journey: design, pattern development, sample cutting, precision CAD cutting, sewing, quality finishing and global delivery from two facilities in Tangier, Morocco.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://avamarie.co/"},{"@type":"ListItem","position":2,"name":"Manufacturing","item":"https://avamarie.co/manufacturing/"}]}]}',
    },
    {
        'slug':    'services',
        'dir':     'services',
        'path':    '/services/',
        'title':   'Fashion Manufacturing Services — Ava Marie',
        'desc':    'End-to-end fashion manufacturing: tech pack development, material sourcing, full production to 250,000+ garments/month, packaging, private label, and quality assurance. Based in Tangier, Morocco.',
        'nav_href':'/services/',
        'section': 'pg-services',
        'json_ld': '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"WebPage","@id":"https://avamarie.co/services/","url":"https://avamarie.co/services/","name":"Fashion Manufacturing Services \\u2014 Ava Marie","description":"End-to-end fashion manufacturing: tech pack development, material sourcing, full production to 250,000+ garments/month, packaging, private label, and quality assurance. Based in Tangier, Morocco.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://avamarie.co/"},{"@type":"ListItem","position":2,"name":"Services","item":"https://avamarie.co/services/"}]},{"@type":"Service","name":"Fashion Manufacturing Services","provider":{"@id":"https://avamarie.co/#organization"},"serviceType":"Fashion Manufacturing","areaServed":"Worldwide","hasOfferCatalog":{"@type":"OfferCatalog","name":"Manufacturing Services","itemListElement":[{"@type":"Offer","itemOffered":{"@type":"Service","name":"Tech Pack Development"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Material Sourcing"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Full Production"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Packaging & Logistics"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Private Label"}},{"@type":"Offer","itemOffered":{"@type":"Service","name":"Quality Assurance"}}]}}]}',
    },
    {
        'slug':    'portfolio',
        'dir':     'portfolio',
        'path':    '/portfolio/',
        'title':   'Portfolio — Ava Marie Fashion Manufacturing',
        'desc':    "Browse Ava Marie’s fashion manufacturing portfolio: womenswear woven, jersey & knits, evening & occasion wear, sportswear & activewear, and swimwear — crafted in Tangier, Morocco.",
        'nav_href':'/portfolio/',
        'section': 'pg-portfolio',
        'json_ld': '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"CollectionPage","@id":"https://avamarie.co/portfolio/","url":"https://avamarie.co/portfolio/","name":"Portfolio \\u2014 Ava Marie Fashion Manufacturing","description":"Browse Ava Marie\'s fashion manufacturing portfolio: womenswear woven, jersey & knits, evening & occasion wear, sportswear & activewear, and swimwear \\u2014 crafted in Tangier, Morocco.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://avamarie.co/"},{"@type":"ListItem","position":2,"name":"Portfolio","item":"https://avamarie.co/portfolio/"}]}]}',
    },
    {
        'slug':    'partners',
        'dir':     'partners',
        'path':    '/partners/',
        'title':   'Our Partners — Ava Marie Manufacturing Network',
        'desc':    "Ava Marie’s global manufacturing network: 390,000+ combined garments per month across Ava Marie in Tangier, Sweet Threads in Leicester, and Jaguar Apparel in Lahore.",
        'nav_href':'/partners/',
        'section': 'pg-partners',
        'json_ld': '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"WebPage","@id":"https://avamarie.co/partners/","url":"https://avamarie.co/partners/","name":"Our Partners \\u2014 Ava Marie Manufacturing Network","description":"Ava Marie\'s global manufacturing network: 390,000+ combined garments per month across Ava Marie in Tangier, Sweet Threads in Leicester, and Jaguar Apparel in Lahore.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://avamarie.co/"},{"@type":"ListItem","position":2,"name":"Partners","item":"https://avamarie.co/partners/"}]}]}',
    },
    {
        'slug':    'contact',
        'dir':     'contact',
        'path':    '/contact/',
        'title':   'Contact Us — Ava Marie Manufacturing',
        'desc':    'Contact Ava Marie\'s manufacturing team in Tangier, Morocco. Reach CEO Anwar Sarodiya or Operations Manager Sara Oumalik. Two production facilities. Start a partnership today.',
        'nav_href':'/contact/',
        'section': 'pg-contact',
        'json_ld': '{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://avamarie.co/#website","url":"https://avamarie.co/","name":"Ava Marie","publisher":{"@id":"https://avamarie.co/#organization"}},{"@type":"Organization","@id":"https://avamarie.co/#organization","name":"Ava Marie","alternateName":"Ava Marie SARL","url":"https://avamarie.co/","logo":"https://avamarie.co/AVA%20MARIE/icon.png","foundingDate":"2021","description":"Premium fashion manufacturer based in Tangier, Morocco.","address":{"@type":"PostalAddress","addressLocality":"Tangier","addressCountry":"MA"},"contactPoint":[{"@type":"ContactPoint","telephone":"+447845847104","contactType":"sales","email":"Anwar@sweetthreadsltd.com"},{"@type":"ContactPoint","telephone":"+212666945417","contactType":"customer support","email":"sara@avamarie.ma"}],"sameAs":["https://www.instagram.com/ava_marie_sarl","https://www.facebook.com/share/1DYx1vYUug/","https://www.linkedin.com/company/ava-marie-sarl/"]},{"@type":"ContactPage","@id":"https://avamarie.co/contact/","url":"https://avamarie.co/contact/","name":"Contact Us \\u2014 Ava Marie Manufacturing","description":"Contact Ava Marie\'s manufacturing team in Tangier, Morocco. Reach CEO Anwar Sarodiya or Operations Manager Sara Oumalik. Two production facilities. Start a partnership today.","isPartOf":{"@id":"https://avamarie.co/#website"},"about":{"@id":"https://avamarie.co/#organization"},"inLanguage":"en"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://avamarie.co/"},{"@type":"ListItem","position":2,"name":"Contact","item":"https://avamarie.co/contact/"}]}]}',
    },
]


def build_section_page(html: str, page: dict) -> str:
    out = html

    # 1. Insert <base href="/"> after charset meta (section pages are in subdirs)
    out = out.replace(
        '<meta charset="UTF-8">\n<meta name="viewport"',
        '<meta charset="UTF-8">\n<base href="/">\n<meta name="viewport"',
        1
    )

    # 2. Title
    out = out.replace(
        f'<title>{HOME_TITLE}</title>',
        f'<title>{page["title"]}</title>',
        1
    )

    # 3. Meta description
    out = out.replace(
        f'<meta name="description" content="{HOME_DESC}">',
        f'<meta name="description" content="{page["desc"]}">',
        1
    )

    canonical_url = f'https://avamarie.co{page["path"]}'

    # 4. Canonical href
    out = out.replace(
        '<link rel="canonical" href="https://avamarie.co/">',
        f'<link rel="canonical" href="{canonical_url}">',
        1
    )

    # 5. OG URL
    out = out.replace(
        '<meta property="og:url" content="https://avamarie.co/">',
        f'<meta property="og:url" content="{canonical_url}">',
        1
    )

    # 6. OG title
    out = out.replace(
        f'<meta property="og:title" content="{HOME_TITLE}">',
        f'<meta property="og:title" content="{page["title"]}">',
        1
    )

    # 7. OG description
    out = out.replace(
        f'<meta property="og:description" content="{HOME_DESC}">',
        f'<meta property="og:description" content="{page["desc"]}">',
        1
    )

    # 8. Twitter title
    out = out.replace(
        f'<meta name="twitter:title" content="{HOME_TITLE}">',
        f'<meta name="twitter:title" content="{page["title"]}">',
        1
    )

    # 9. Twitter description
    out = out.replace(
        f'<meta name="twitter:description" content="{HOME_DESC}">',
        f'<meta name="twitter:description" content="{page["desc"]}">',
        1
    )

    # 10. JSON-LD — replace entire script content (use callable to avoid \u escape issues)
    json_ld = page['json_ld']
    out = re.sub(
        r'(<script type="application/ld\+json">).*?(</script>)',
        lambda m: m.group(1) + json_ld + m.group(2),
        out,
        count=1,
        flags=re.DOTALL
    )

    # 11. Nav active: remove from home link, add to this page's link
    out = out.replace(
        'class="nav-link active" href="/" data-pg="home"',
        'class="nav-link" href="/" data-pg="home"',
        1
    )
    slug_map = {
        '/our-story/':    'story',
        '/manufacturing/':'journey',
        '/services/':     'services',
        '/portfolio/':    'portfolio',
        '/partners/':     'partners',
        '/contact/':      'contact',
    }
    nav_slug = slug_map[page['nav_href']]
    out = out.replace(
        f'class="nav-link" href="{page["nav_href"]}" data-pg="{nav_slug}"',
        f'class="nav-link active" href="{page["nav_href"]}" data-pg="{nav_slug}"',
        1
    )

    # 12. Section active: deactivate home, activate this section
    out = out.replace(
        'id="pg-home" class="page active"',
        'id="pg-home" class="page"',
        1
    )
    out = out.replace(
        f'id="{page["section"]}" class="page"',
        f'id="{page["section"]}" class="page active"',
        1
    )

    # 13. JS current page variable
    out = out.replace(
        "let current='home';",
        f"let current='{page['slug']}';",
        1
    )

    return out


def main():
    template_path = os.path.join(ROOT, 'index.html')
    if not os.path.exists(template_path):
        print(f'ERROR: template not found at {template_path}', file=sys.stderr)
        sys.exit(1)

    with open(template_path, encoding='utf-8') as f:
        template = f.read()

    errors = []
    for page in PAGES:
        out = build_section_page(template, page)

        # Verify the transformation applied correctly
        if f"let current='{page['slug']}';" not in out:
            errors.append(f"{page['dir']}: current variable not updated")
        if f'<title>{page["title"]}</title>' not in out:
            errors.append(f"{page['dir']}: title not updated")
        if f'id="{page["section"]}" class="page active"' not in out:
            errors.append(f"{page['dir']}: section active not set")

        out_dir = os.path.join(ROOT, page['dir'])
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, 'index.html')
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(out)
        print(f'  wrote {page["dir"]}/index.html')

    if errors:
        for e in errors:
            print(f'  ERROR: {e}', file=sys.stderr)
        sys.exit(1)

    print(f'Build complete: {len(PAGES)} pages generated from index.html')


if __name__ == '__main__':
    main()
