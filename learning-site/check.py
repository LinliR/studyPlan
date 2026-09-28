#!/usr/bin/env python3
"""Content/navigation integrity checks for the generated offline learning page."""
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs
import build


class Inspect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links, self.resources = [], [], []
        self.answers = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a" and "href" in attrs:
            self.links.append(attrs["href"])
        if tag in ("script", "img", "iframe") and "src" in attrs:
            self.resources.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.resources.append(attrs.get("href"))
        if tag == "details" and "answer-card" in attrs.get("class", ""):
            self.answers += 1


page = (Path(__file__).parent / "dist/index.html").read_text()
match = re.search(r"window\.COURSE = (.+?);</script>", page, re.S)
assert match, "Embedded content not found"
docs = json.loads(match[1])["docs"]
assert len(docs) == 27
assert sum(len(d["units"]) for d in docs) == 71
assert sum(d["path"].startswith("practice/stage-") for d in docs) == 6
lookup = {d["path"]: d for d in docs}
parsers = {}
for d in docs:
    source = (build.ROOT / d["path"]).read_text()
    assert d["html"] == build.render(source, d["path"])["html"], f"Stale content: {d['path']}"
    assert d["title"] == source.splitlines()[0].lstrip("# ")
    parser = Inspect()
    parser.feed(d["html"])
    assert len(parser.ids) == len(set(parser.ids)), f"Duplicate anchors: {d['path']}"
    parsers[d["path"]] = parser

count = 0
for path, parser in parsers.items():
    for href in parser.links:
        if not href.startswith("#doc="):
            assert href.startswith(("https://", "http://")) or href == "#home", (path, href)
            continue
        count += 1
        args = parse_qs(href[1:])
        target = args["doc"][0]
        assert target in lookup, (path, target)
        if "section" in args:
            assert args["section"][0] in parsers[target].ids, (path, href)

assert sum(p.answers for p in parsers.values()) == 48
assert all(len(d["checks"]) >= 4 for d in docs if d["path"].startswith("practice/stage-") and "00-" not in d["path"])
shell = Inspect()
shell.feed(page)
assert not shell.resources, f"Offline page depends on external assets: {shell.resources}"
assert "/*__" not in page, "Unreplaced build token"
assert not re.search(r"\b(?:fetch|XMLHttpRequest)\s*\(", page), "Unexpected network dependency"
assert '&lt;Integer&gt;' in lookup['modules/m01-java.md']['html'], "Java generics were treated as HTML"
assert '<script>' not in build.inline('<script>alert(1)</script>', 'README.md')
assert html.unescape(build.inline('BigDecimal **精确** `0.10`', 'README.md')) == 'BigDecimal <strong>精确</strong> <code>0.10</code>'
print(f"PASS: 27 current documents, 71 units, 6 stages, 48 revealable questions, {count} internal links, offline assets and escaping")
