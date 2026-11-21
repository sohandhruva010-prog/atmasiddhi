"""Convert a notes PDF into a list of structured blocks (headings, paragraphs, bullets).

Works across the different note formats in the course folder (Noto Sans exports with
detached bullet glyphs, Arial exports with inline bullets, Times exports where headings
are bold body-size lines).
"""
import html
import re
from collections import Counter

import fitz

BULLETS = "•●○◦▪■▫·➢►✓"
PAGE_NO = re.compile(r"^\s*(page\s+)?\d+(\s+of\s+\d+)?\s*$", re.I)
NUMBERED = re.compile(r"^\s*(\(?\d{1,2}[\.\)]\s|\d+\.\d+\s|[A-Z]\)\s|Q\d|Step \d)")
JUNK = [
    (re.compile("\ufb00"), "ff"), (re.compile("\ufb03"), "ffi"), (re.compile("\ufb04"), "ffl"),
    (re.compile("\ufb01"), "fi"), (re.compile("\ufb02"), "fl"),
    (re.compile(r"\s*Pasted text\s*\(\d+\)"), ""),
    (re.compile(r"\s*Pasted markdown\s*\(\d+\)"), ""),
    (re.compile(r"\*\*"), ""),
    (re.compile(r"[‑‐]"), "-"),
    (re.compile(r"[� ​]"), " "),
    (re.compile(r"ﬁ"), "fi"),
    (re.compile(r"ﬂ"), "fl"),
]


def clean(t):
    if any("\ud800" <= c <= "\udfff" for c in t):
        t = t.encode("utf-16", "surrogatepass").decode("utf-16", "ignore")
        t = "".join(c for c in t if not ("\ud800" <= c <= "\udfff"))
    for rx, rep in JUNK:
        t = rx.sub(rep, t)
    return t


def is_bold(s):
    return bool(s["flags"] & 16) or "Bold" in s["font"] or "Black" in s["font"]


def is_italic(s):
    return bool(s["flags"] & 2) or "Italic" in s["font"] or "Oblique" in s["font"]


def rows_of(doc, skip_rx=None):
    """Return visual rows: spans on the same baseline merged left-to-right."""
    rows = []
    for pno, pg in enumerate(doc):
        H = pg.rect.height
        raw = []
        for b in pg.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if s["text"]]
                if not "".join(s["text"] for s in spans).strip():
                    continue
                x0, y0, x1, y1 = l["bbox"]
                raw.append([pno, x0, y0, y1, spans])
        raw.sort(key=lambda r: (round(r[2] / 2.5), r[1]))
        merged = []
        for r in raw:
            if merged and abs(merged[-1][2] - r[2]) < 2.6 and r[1] >= merged[-1][1] - 1:
                m = merged[-1]
                m[4] = m[4] + r[4]
                m[3] = max(m[3], r[3])
            else:
                merged.append(r)
        for pno_, x0, y0, y1, spans in merged:
            text = clean("".join(s["text"] for s in spans))
            st = text.strip()
            if not st:
                continue
            if PAGE_NO.match(st) and (y0 > H * 0.86 or y0 < H * 0.08):
                continue
            if re.fullmatch(r"[_\-–—\s]{3,}", st):
                continue
            if skip_rx and skip_rx.search(st):
                continue
            rows.append(dict(p=pno_, x=x0, y=y0, y1=y1, spans=spans, text=text, H=H))
    return rows


def spans_html(spans, strip_leading_bullet=False):
    out, cur, cur_style = [], [], None
    first = True
    for s in spans:
        t = clean(s["text"])
        if strip_leading_bullet and first:
            t2 = t.lstrip()
            if t2 and t2[0] in BULLETS:
                t = t2[1:]
            elif t2.startswith("- ") or t2 == "-":
                t = t2[1:]
            if not t.strip():
                continue
            t = t.lstrip()
            first = False
        style = (is_bold(s) and bool(t.strip()), is_italic(s) and bool(t.strip()))
        if style != cur_style and cur:
            out.append((cur_style, "".join(cur)))
            cur = []
        cur_style = style if t.strip() else (cur_style or style)
        cur.append(t)
    if cur:
        out.append((cur_style, "".join(cur)))
    res = []
    for (b, i), t in out:
        e = html.escape(t, quote=False)
        if not t.strip():
            res.append(e)
            continue
        lead = e[: len(e) - len(e.lstrip())]
        trail = e[len(e.rstrip()):]
        core = e.strip()
        if i:
            core = f"<em>{core}</em>"
        if b:
            core = f"<strong>{core}</strong>"
        res.append(lead + core + trail)
    return "".join(res)


def body_size(rows):
    c = Counter()
    for r in rows:
        for s in r["spans"]:
            c[round(s["size"], 1)] += len(s["text"])
    return c.most_common(1)[0][0] if c else 11


def row_size(r):
    c = Counter()
    for s in r["spans"]:
        if s["text"].strip():
            c[round(s["size"], 1)] += len(s["text"])
    return c.most_common(1)[0][0] if c else 0


def all_bold(r):
    sp = [s for s in r["spans"] if s["text"].strip() and s["text"].strip() not in BULLETS]
    return bool(sp) and all(is_bold(s) for s in sp)


def bullet_of(r):
    t = r["text"].lstrip()
    if t and t[0] in BULLETS:
        return t[0]
    if t.startswith("- ") and len(t) > 3:
        return "-"
    return None


def convert(path, skip_rx=None, drop_title=True):
    doc = fitz.open(path)
    rows = rows_of(doc, skip_rx)
    if not rows:
        return []
    body = body_size(rows)
    blocks = []
    prev = None
    run_xs = []  # x positions of bullet glyphs in the current list run
    for r in rows:
        sz = row_size(r)
        t = r["text"].strip()
        g = bullet_of(r)
        if g and not t[1:].strip():
            continue  # lone glyph with nothing to attach
        kind = "p"
        if g:
            kind = "li"
        elif all_bold(r) and sz >= body * 1.45:
            kind = "h2"
        elif all_bold(r) and sz >= body * 1.12:
            kind = "h3"
        elif all_bold(r) and len(t) < 110:
            kind = "hb"  # bold body-size line: maybe a heading, decided later
        lh = max(r["y1"] - r["y"], sz)
        gap = (r["y"] - prev["y1"]) if prev and prev["p"] == r["p"] else None
        new = True
        if prev is not None and blocks:
            last = blocks[-1]
            same_page_close = gap is not None and gap < lh * 0.55
            cross_page = prev["p"] != r["p"] and not re.search(r"[\.:!?”\"]\s*$", prev["text"])
            cont_ok = (same_page_close or cross_page) and not NUMBERED.match(t)
            if kind in ("h2", "h3") and last["k"] == kind and cont_ok:
                new = False
            elif kind in ("p", "hb") and cont_ok and last["k"] in ("p", "li", "hb"):
                if last["k"] == "li":
                    new = r["x"] < last["gx"] + (-1 if last.get("g") == "-" else 3)
                else:
                    new = False
                    if last["k"] == "hb" and kind == "p":
                        last["k"] = "p"
        if new:
            lvl = 0
            if g:
                if not blocks or blocks[-1]["k"] != "li":
                    run_xs = [r["x"]]
                else:
                    if r["x"] > run_xs[-1] + 6:
                        run_xs.append(r["x"])
                    else:
                        while len(run_xs) > 1 and r["x"] < run_xs[-1] - 6:
                            run_xs.pop()
                lvl = min(len(run_xs) - 1, 3)
            blocks.append(dict(k=kind, gx=r["x"], lvl=lvl, g=g,
                               html=spans_html(r["spans"], strip_leading_bullet=bool(g)),
                               bold_only=all_bold(r), text=t))
        else:
            last = blocks[-1]
            h = spans_html(r["spans"])
            if last["html"].endswith("-") and not last["html"].endswith(" -"):
                sep = ""
            elif prev["text"].rstrip().endswith(";") and len(prev["text"]) < 80:
                sep = "<br>"
            else:
                sep = " "
            last["html"] = (last["html"].rstrip() + sep + h.lstrip())
            last["text"] += " " + t
            last["bold_only"] = last["bold_only"] and all_bold(r)
        prev = r

    # Resolve bold body-size lines: headings when standalone and short.
    out = []
    for i, b in enumerate(blocks):
        k = b["k"]
        if k == "hb":
            short = len(b["text"]) < 120 and not re.search(r"[\.;,]$", b["text"].strip())
            k = "h4" if short else "p"
            if re.match(r"^\d+[\.\)]\s+\S", b["text"]) and short:
                k = "h3"
        h = re.sub(r"\s{2,}", " ", b["html"]).strip()
        if k.startswith("h"):
            h = re.sub(r"</?strong>", "", h)
        if not re.sub(r"<[^>]+>", "", h).strip():
            continue
        out.append(dict(k=k, lvl=b["lvl"], html=h))

    if drop_title and out and out[0]["k"] in ("h2", "h3"):
        title = re.sub(r"<[^>]+>", "", out[0]["html"])
        out = out[1:]
        return [dict(k="title", lvl=0, html=title)] + out
    return out


def render(blocks):
    """Blocks -> HTML string with nested lists."""
    out, depth = [], -1
    tags = {"p": "p", "h2": "h3", "h3": "h4", "h4": "h5"}
    for b in blocks:
        if b["k"] == "title":
            continue
        if b["k"] == "li":
            lvl = b["lvl"]
            if lvl > depth:
                out.append("<ul>")
                depth += 1
                while depth < lvl:
                    out.append("<li class=nb><ul>")
                    depth += 1
            else:
                while depth > lvl:
                    out.append("</li></ul>")
                    depth -= 1
                out.append("</li>")
            out.append("<li>" + b["html"])
        else:
            while depth >= 0:
                out.append("</li></ul>")
                depth -= 1
            out.append(f"<{tags[b['k']]}>{b['html']}</{tags[b['k']]}>")
    while depth >= 0:
        out.append("</li></ul>")
        depth -= 1
    return "".join(x if x.startswith("<") and not x.startswith("<li>") else x for x in out).replace("<li>", "\n<li>")
