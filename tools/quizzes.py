"""Parse the subjective-quiz PDFs into sections of question/answer pairs."""
import html
import re

import fitz

import pdfnotes

BLUE = 0x4E81BD
SKIP = re.compile(r"^(Atmasiddhi Shastra Online Course|Page \d+ of\s*\d*|SRMD COURSES?)\s*$", re.I)
QNUM = re.compile(r"^\s*(\d{1,2})\s*[\.\)]\s+")


def classify(r, mode):
    sp = [s for s in r["spans"] if s["text"].strip()]
    if any(s["color"] == BLUE for s in sp):
        return "sec"
    if mode == "bold" and sp and sum(len(s["text"]) for s in sp if pdfnotes.is_bold(s)) > 0.6 * sum(len(s["text"]) for s in sp):
        return "ans"
    if mode == "helv" and sp and any(s["font"].startswith("Helvetica") for s in sp):
        return "ans"
    return "q"


def paragraphs(lines):
    if not lines:
        return []
    gaps = sorted(g for g, _, _ in lines[1:] if g < 50)
    med = gaps[len(gaps) // 2] if gaps else 3
    out = []
    for i, (g, h, t) in enumerate(lines):
        new = (i == 0 or g > med * 1.8 + 3 or t.startswith(("- ", "• ", "● ", "○ "))
               or re.match(r"^(\d+[\.\)]|[a-z]\)|[ivx]+\))\s", t)
               or (g > med + 2 and re.search(r"[\.:]\s*$", lines[i - 1][2])))
        if new:
            out.append(h)
        else:
            sep = "" if out[-1].endswith("-") and not out[-1].endswith(" -") else " "
            out[-1] = out[-1].rstrip() + sep + h
    return out


def parse(path, mode):
    doc = fitz.open(path)
    rows = pdfnotes.rows_of(doc, SKIP)
    # Drop the cover page (instructions) - start at first section header or numbered question after page 0
    start = next(i for i, r in enumerate(rows) if r["p"] > 0 or classify(r, mode) == "sec")
    rows = rows[start:]
    sections, sec, item = [], None, None
    prev = None
    q_open = False
    for r in rows:
        kind = classify(r, mode)
        t = r["text"].strip()
        if kind == "sec":
            if sec is not None and prev is not None and prev.get("_k") == "sec" and not sec["items"]:
                sec["title"] += " " + t
            else:
                sec = dict(title=t, items=[])
                sections.append(sec)
            item = None
            r["_k"] = "sec"
            prev = r
            continue
        if sec is None:
            sec = dict(title="", items=[])
            sections.append(sec)
        gap = (r["y"] - prev["y1"]) if prev and prev["p"] == r["p"] else 99
        if kind == "q" and mode == "plain":
            if QNUM.match(t):
                kind = "q"
                q_open = True
            elif q_open and item is not None:
                kind = "q"
            else:
                kind = "ans"
        if kind == "q":
            starts = QNUM.match(t)
            if starts or item is None or (item["a"] and mode != "plain"):
                item = dict(q=t, a=[])
                sec["items"].append(item)
            else:
                item["q"] += " " + t
            if mode == "plain" and re.search(r"[\?\.]\s*\)?\s*$", t):
                q_open = False
        else:
            if item is None:
                item = dict(q="", a=[])
                sec["items"].append(item)
            h = pdfnotes.spans_html(r["spans"])
            if mode == "bold":
                h = re.sub(r"</?strong>", "", h)
            item["a"].append((gap, h.strip(), t))
        r["_k"] = kind
        prev = r
    # tidy
    out = []
    for s in sections:
        title = re.sub(r"\s+", " ", s["title"]).strip()
        m = re.search(r"Marks:?\s*(\d+)", title)
        marks = int(m.group(1)) if m else None
        title = re.sub(r"\s*Marks:?\s*\d+\s*$", "", title).strip()
        items = []
        for it in s["items"]:
            q = re.sub(r"\s+", " ", it["q"]).strip()
            q = QNUM.sub("", q)
            if not q and not it["a"]:
                continue
            a = [re.sub(r"^(- |• |● )", "", p) for p in paragraphs(it["a"]) if p.strip()]
            items.append(dict(q=html.escape(q, quote=False), a=a))
        if items:
            out.append(dict(title=title, marks=marks, items=items))
    return out
