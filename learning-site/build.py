#!/usr/bin/env python3
"""Compile the repository's learning guides into a self-contained offline HTML file.

No third-party dependencies. The deliberately small Markdown renderer covers the
headings, lists, tables, links, code and explicit anchors used in this repository.
Unsupported local links fail the build rather than silently losing navigation.
"""
import html
import hashlib
import json
import posixpath
import re
from pathlib import Path
from urllib.parse import quote, urlsplit

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FILES = ["README.md", "ROADMAP.md", "METHOD.md", "PROGRESS.md"]
FILES += [str(p.relative_to(ROOT)) for p in sorted((ROOT / "modules").glob("*.md"))]
FILES += ["practice/README.md"]
FILES += [str(p.relative_to(ROOT)) for p in sorted((ROOT / "practice").glob("stage-*.md"))]
FILES += ["resources/REFERENCES.md"]
FILES += [str(p.relative_to(ROOT)) for p in sorted((ROOT / "templates").glob("*.md"))]


def inline(text, path):
    # Protect links and code before escaping literal angle brackets (e.g. generics).
    tokens = []

    def hold(value):
        tokens.append(value)
        return f"\x00{len(tokens)-1}\x00"

    text = re.sub(r"`([^`]+)`", lambda m: hold(f"<code>{html.escape(m[1])}</code>"), text)

    def link(m):
        label, target = m[1], m[2]
        parts = urlsplit(target)
        if parts.scheme in ("https", "http"):
            attrs = f'href="{html.escape(target, quote=True)}" target="_blank" rel="noopener noreferrer"'
        elif not parts.scheme:
            dest = posixpath.normpath(posixpath.join(posixpath.dirname(path), parts.path)) if parts.path else path
            # The landing README also documents the generated HTML entry point.
            if dest == "learning-site/dist/index.html":
                attrs = 'href="#home"'
            elif dest in FILES:
                route = "#doc=" + quote(dest, safe="")
                if parts.fragment:
                    route += "&section=" + quote(parts.fragment, safe="")
                attrs = f'href="{html.escape(route, quote=True)}"'
            else:
                raise ValueError(f"Unknown local document link: {path}: {target}")
        else:
            raise ValueError(f"Unsupported URL scheme: {target}")
        return hold(f"<a {attrs}>{html.escape(label)}</a>")

    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, text)
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    for _ in range(2):
        text = re.sub(r"\x00(\d+)\x00", lambda m: tokens[int(m[1])], text)
    return text


def cells(line):
    return [v.strip() for v in line.strip().strip("|").split("|")]


def render(source, path):
    lines = source.splitlines()
    out, toc, units, checks = [], [], [], []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            block = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            if i == len(lines):
                raise ValueError(f"Unclosed code block: {path}")
            out.append("<pre><code>" + html.escape("\n".join(block)) + "</code></pre>")
        elif re.fullmatch(r'<a id="[\w-]+"></a>', line):
            out.append(line)
        elif line.startswith("#"):
            m = re.match(r"^(#{1,6})\s+(.+)$", line)
            if not m:
                raise ValueError(f"Invalid heading: {path}: {line}")
            level, title = len(m[1]), m[2]
            anchor = "heading-" + str(len(toc))
            toc.append({"id": anchor, "title": title, "level": level})
            out.append(f'<h{level} id="{anchor}">{inline(title, path)}</h{level}>')
        elif line.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|\-]+\|$", lines[i + 1]):
            headers = cells(line)
            rows = []
            i += 2
            while i < len(lines) and lines[i].startswith("|"):
                row = cells(lines[i])
                if len(row) != len(headers):
                    raise ValueError(f"Table column mismatch: {path}: {lines[i]}")
                rows.append(row)
                if re.fullmatch(r"M\d{2}-\d+", row[0]) and len(row) == 5:
                    units.append(dict(zip(["id", "topic", "prereq", "method", "criteria"], row)))
                i += 1
            i -= 1
            table = '<div class="table-scroll" tabindex="0" role="region" aria-label="' + html.escape(headers[0]) + '表格"><table><thead><tr>'
            table += "".join(f'<th scope="col">{inline(h, path)}</th>' for h in headers) + "</tr></thead><tbody>"
            table += "".join("<tr>" + "".join(f"<td>{inline(c, path)}</td>" for c in row) + "</tr>" for row in rows)
            out.append(table + "</tbody></table></div>")
        elif re.match(r"^- \[[ x]\] ", line):
            block = '<ul class="checklist">'
            while i < len(lines) and re.match(r"^- \[[ x]\] ", lines[i]):
                content = lines[i][6:]
                cid = path + "::" + hashlib.sha256(content.encode()).hexdigest()[:12]
                checks.append({"id": cid, "text": content})
                block += f'<li><label><input type="checkbox" data-check="{html.escape(cid)}"><span>{inline(content, path)}</span></label></li>'
                i += 1
            i -= 1
            out.append(block + "</ul>")
        elif re.match(r"^(?:- |\d+\. )", line):
            ordered = bool(re.match(r"^\d+\. ", line))
            tag = "ol" if ordered else "ul"
            pattern = r"^\d+\. " if ordered else r"^- "
            block = f"<{tag}>"
            while i < len(lines) and re.match(pattern, lines[i]):
                content = re.sub(pattern, "", lines[i])
                # Original open questions become revealable answer cards.
                if "通过：" in content and path.startswith("modules/"):
                    question, answer = content.split("通过：", 1)
                    block += f'<li><details class="answer-card"><summary>{inline(question, path)}</summary><p><b>判断依据</b> {inline(answer, path)}</p></details></li>'
                else:
                    block += f"<li>{inline(content, path)}</li>"
                i += 1
            i -= 1
            out.append(block + f"</{tag}>")
        elif line.strip() == "---":
            out.append("<hr>")
        else:
            paragraph = [line]
            while i + 1 < len(lines) and lines[i + 1].strip() and not re.match(r"^(#|\||- |\d+\. |```|<a )", lines[i + 1]):
                i += 1
                paragraph.append(lines[i])
            out.append("<p>" + inline(" ".join(paragraph), path) + "</p>")
        i += 1
    return {"html": "\n".join(out), "toc": toc, "units": units, "checks": checks}


def main():
    docs = []
    for path in FILES:
        source = (ROOT / path).read_text(encoding="utf-8")
        title = source.splitlines()[0].lstrip("# ")
        rendered = render(source, path)
        searchable = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", rendered["html"]))).strip()
        doc = {"path": path, "title": title, "text": searchable, **rendered}
        docs.append(doc)
    assert len(docs) == 27, "Unexpected learning document count"
    assert sum(len(d["units"]) for d in docs) == 71, "Unexpected unit count"
    data = json.dumps({"docs": docs}, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    page = (HERE / "src/index.html").read_text()
    page = page.replace("/*__STYLE__*/", (HERE / "src/styles.css").read_text())
    page = page.replace("/*__DATA__*/", "window.COURSE = " + data + ";")
    page = page.replace("/*__APP__*/", (HERE / "src/app.js").read_text())
    out = HERE / "dist/index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"Built {out}: {len(docs)} documents, 71 units, {out.stat().st_size:,} bytes; no external assets")


if __name__ == "__main__":
    main()
