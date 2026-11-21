"""Build the website's data files from the course PDFs.

Usage:  python tools/build.py /path/to/Atmasiddhi   (folder with "Verses 1-23", "Introduction", ...)
Writes: data/site.json, data/quizzes.json, data/notes/<episode>.html
Needs:  PyMuPDF (pip install pymupdf)
"""
import glob
import json
import os
import re
import sys

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pdfnotes  # noqa: E402
import quizzes  # noqa: E402
import verses as vparse  # noqa: E402

SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "..", "data")
os.makedirs(os.path.join(OUT, "notes"), exist_ok=True)

SECTIONS = [
    dict(id="intro", n=0, name="An Introduction", sub="Why study this text · The composer · The occasion · Mangalacharan",
         iast="Upodghāta", range=None, folder="Introduction"),
    dict(id="s1", n=1, name="Introduction to the Path", sub="Sadguru, the seeker, and the two deluded extremes",
         iast="Upodghāta", range=[1, 23], folder="Verses 1-23"),
    dict(id="s2", n=2, name="Attributes of a Bigot", sub="Matarthi — one attached to opinion",
         iast="Matārthī-lakṣaṇa", range=[24, 33], folder="Verses 24-33"),
    dict(id="s3", n=3, name="Attributes of a True Seeker", sub="Atmarthi — one who seeks only the Self",
         iast="Ātmārthī-lakṣaṇa", range=[34, 42], folder="Verses 34-42"),
    dict(id="s4", n=4, name="Naming the Six Fundamental Truths", sub="The six padas of the soul",
         iast="Ṣaṭpadanāmakathana", range=[43, 44], folder="Verses 43-44"),
    dict(id="s5", n=5, name="First Fundamental — The Soul Exists", sub="Ātmā che",
         iast="Ātmā che", range=[45, 58], folder="Verses 45-58"),
    dict(id="s6", n=6, name="Second Fundamental — The Soul is Eternal", sub="Te nitya che",
         iast="Te nitya che", range=[59, 70], folder="Verses 59-70"),
    dict(id="s7", n=7, name="Third Fundamental — The Soul is the Doer", sub="Che kartā nijakarma",
         iast="Che kartā nijakarma", range=[71, 78], folder="Verses 71-78"),
    dict(id="s8", n=8, name="Fourth Fundamental — The Soul is the Enjoyer", sub="Che bhoktā",
         iast="Che bhoktā", range=[79, 86], folder="Verses 79-86"),
    dict(id="s9", n=9, name="Fifth Fundamental — Liberation Exists", sub="Vaḷī mokṣa che",
         iast="Vaḷī mokṣa che", range=[87, 91], folder="Verses 87-91"),
    dict(id="s10", n=10, name="Sixth Fundamental — The Path of Liberation", sub="Mokṣa upāya sudharma",
         iast="Mokṣa upāya sudharma", range=[92, 118], folder="Verses 92-107"),
    dict(id="s11", n=11, name="Expression of the Disciple's Enlightenment", sub="The seed of Self-realisation sprouts",
         iast="Śiṣyabodhabījaprāptikathana", range=[119, 127], folder="Verses 119-127"),
    dict(id="s12", n=12, name="Conclusion", sub="The essence, distilled",
         iast="Upasaṁhāra", range=[128, 142], folder="Verses 128-142"),
]

SECTION_INTRO_FILES = {
    "s2": "Verses 24-33/Section 2- Intro.pdf",
    "s3": "Verses 34-42/Introduction- Attributes of a True Seeker.pdf",
    "s4": "Verses 43-44/Introduction to the Main Subject Matter of the Text.pdf",
    "s5": "Verses 45-58/Introduction to the First Fundamental.pdf",
    "s6": "Verses 59-70/Introduction to the Second Fundamental.pdf",
    "s7": "Verses 71-78/Introduction to the Third Fundamental.pdf",
    "s8": "Verses 79-86/Introduction to the Fourth Fundamental.pdf",
    "s9": "Verses 87-91/Introduction to the Fifth Fundamental.pdf",
    "s10": "Verses 92-107/Introduction to the Sixth Fundamental.pdf",
    "s11": "Verses 119-127/Introduction - Expression of Disciple's Enlightenment.pdf",
    "s12": "Verses 128-142/Introduction- Conclusion.pdf",
}
INTRO_FILES = {
    "intro1": "Introduction/1. Why Study This Text.pdf",
    "intro2": "Introduction/2. About the Composer and the Text.pdf",
    "intro3": "Introduction/3. he Inspiration, Occasion, and Worthy Receivers.pdf",
    "intro6": "Introduction/6. Mangalācharaṇ_ “patit Jan Pāvani”.pdf",
}
QUIZ_FILES = [
    # id, section ids, file, mode, date
    ("intro", ["intro"], None, "manual", "2025-10-24"),
    ("s1", ["s1"], "Verses 1-23/Section 1- Subjective Quiz.pdf", "bold", "2025-11-01"),
    ("s2", ["s2"], "Verses 24-33/Section 2- Subjective Quiz.pdf", "bold", None),
    ("s3", ["s3"], "Verses 34-42/Section 3- Subjective Quiz.pdf", "bold", None),
    ("s45", ["s4", "s5"], "Verses 45-58/Sections 4 and 5- Subjective Quiz.pdf", "plain", "2025-12-30"),
    ("s6", ["s6"], "Verses 59-70/Section 6- Subjective Quiz.pdf", "bold", None),
    ("s7", ["s7"], "Verses 71-78/Section 7- Subjective Quiz.pdf", "bold", None),
    ("s8", ["s8"], "Verses 79-86/Section 8- Subjective Quiz.pdf", "bold", None),
    ("s9", ["s9"], "Verses 87-91/Section 9- Subjective Quiz.pdf", "bold", None),
    ("s10a", ["s10"], "Verses 92-107/Section 10A- Subjective Quiz.pdf", "bold", "2026-05-05"),
    ("s10b", ["s10"], "Verses 108-118/Section 10B- Subjective Quiz.pdf", "helv", "2026-11-01"),
    ("s11", ["s11"], "Verses 119-127/Section 11- Subjective Quiz.pdf", "helv", None),
]


def P(rel):
    return os.path.join(SRC, rel)


def section_of(n):
    for s in SECTIONS:
        if s["range"] and s["range"][0] <= n <= s["range"][1]:
            return s["id"]


def verse_files():
    out = {}
    for f in glob.glob(os.path.join(SRC, "Verses *", "Verse *.pdf")):
        m = re.match(r"Verse (\d+)\s*-", os.path.basename(f))
        if m:
            out.setdefault(int(m.group(1)), []).append(f)
    for n in out:  # primary file first ("(1)" copies are supplementary)
        out[n].sort(key=lambda p: ("(1)" in p, len(p)))
    return out


def notes_html(paths, extra_titles=None):
    parts, pages = [], 0
    for i, p in enumerate(paths):
        blocks = pdfnotes.convert(p)
        pages += len(fitz.open(p))
        if i:
            parts.append(f'<div class="notes-break"><span>{(extra_titles or {}).get(i, "Further notes")}</span></div>')
        parts.append(pdfnotes.render(blocks))
    return "\n".join(parts), pages


def split_sessions_3_5():
    blocks = pdfnotes.convert(P("Introduction/3-5 Sessions.pdf"), drop_title=False)
    chunks, cur = [[]], 0
    for b in blocks:
        txt = re.sub(r"<[^>]+>", "", b["html"])
        if re.match(r"End of Session \d", txt):
            chunks.append([])
            continue
        chunks[-1].append(b)
    # drop "Title Page" boilerplate lines
    cleaned = []
    for c in chunks:
        c = [b for b in c if re.sub(r"<[^>]+>", "", b["html"]).strip() not in ("Title Page",)]
        cleaned.append(c)
    return cleaned  # [session3, session4, session5]


def write_note(eid, html):
    with open(os.path.join(OUT, "notes", f"{eid}.html"), "w") as fh:
        fh.write(html)


def main():
    videos = {}
    order = []
    for line in open(os.path.join(HERE, "videos.txt")):
        parts = line.strip().split("|")
        if len(parts) >= 3:
            videos[parts[0]] = dict(yt=parts[1], dur=parts[2], title=parts[3] if len(parts) > 3 else None)
            order.append(parts[0])

    # ---------------- verses
    meanings = {v["n"]: v for v in vparse.parse_meanings(P("Extra/Atmasiddhi Shastra- Verses With Meanings.pdf"))}
    iast = vparse.parse_iast(P("Extra/Atmasiddhi Shastra- English Transliteration.pdf"))
    vfiles = verse_files()
    verses, total_pages = [], 0
    for n in range(1, 143):
        m = meanings[n]
        il = iast.get(n, [])
        words = []
        for w in m["words"]:
            if "=" in w:
                a, b = w.split("=", 1)
                words.append([a.strip(), b.strip()])
        html, pages = notes_html(vfiles.get(n, []), {1: "Additional notes on this verse"})
        total_pages += pages
        has = bool(vfiles.get(n))
        if has:
            write_note(f"v{n}", html)
        verses.append(dict(
            n=n, title=m["title"], section=section_of(n),
            tr=m["verse"], iast=il, gu=[vparse.to_gujarati(x) for x in il],
            link=m["link"], words=words, short=m["short"],
            yt=videos[f"v{n}"]["yt"], dur=videos[f"v{n}"]["dur"], notes=has,
        ))

    # ---------------- episodes (all 159 satsangs in order)
    s35 = split_sessions_3_5()
    episodes = []
    for eid in order:
        v = videos[eid]
        ep = dict(id=eid, yt=v["yt"], dur=v["dur"], notes=False)
        if eid.startswith("intro"):
            k = int(eid[5:])
            ep.update(kind="intro", section="intro", title=v["title"], label=f"Session {k}")
            html = ""
            if eid in INTRO_FILES:
                html, pages = notes_html([P(INTRO_FILES[eid])])
                total_pages += pages
            if k == 3 and s35[0]:
                html += '\n<div class="notes-break"><span>Session 3 — extended notes</span></div>\n' + pdfnotes.render(s35[0])
            if k in (4, 5) and len(s35) > k - 3:
                html = pdfnotes.render(s35[k - 3])
            if html.strip():
                write_note(eid, html)
                ep["notes"] = True
        elif eid.startswith("s"):
            sec = next(s for s in SECTIONS if s["id"] == eid)
            ep.update(kind="section", section=eid, title=f"Introduction to Section {sec['n']}",
                      label=f"Section {sec['n']} · Introduction")
            if eid in SECTION_INTRO_FILES:
                html, pages = notes_html([P(SECTION_INTRO_FILES[eid])])
                total_pages += pages
                write_note(eid, html)
                ep["notes"] = True
        else:
            n = int(eid[1:])
            vv = verses[n - 1]
            ep.update(kind="verse", n=n, section=vv["section"], title=vv["title"], label=f"Verse {n}", notes=vv["notes"])
        episodes.append(ep)
    total_pages += len(fitz.open(P("Introduction/3-5 Sessions.pdf")))

    # ---------------- quizzes
    manual = json.load(open(os.path.join(HERE, "manual_quizzes.json")))
    qz = []
    for qid, secs, f, mode, date in QUIZ_FILES:
        parts = manual["intro"] if mode == "manual" else quizzes.parse(P(f), mode)
        parts = fix_quiz(qid, parts)
        qz.append(dict(id=qid, sections=secs, date=date, parts=parts,
                       marks=sum(p["marks"] or 0 for p in parts)))
    bonus = manual["bonus"]

    stuti = vparse.parse_stuti(P("Extra/Atmasiddhi Shastra- English Transliteration.pdf"))
    site = dict(sections=SECTIONS, verses=verses, episodes=episodes, stuti=stuti,
                stats=dict(verses=142, satsangs=len(episodes), hours=round(sum(dur_s(e["dur"]) for e in episodes) / 3600, 1),
                           notePages=total_pages, quizzes=len(qz) + 1,
                           questions=sum(len(p["items"]) for q in qz for p in q["parts"]) + len(bonus["items"])),
                playlist="PLaUSuQmcD7zETQ8hkpYxqkhkDkvf_Fa2u")
    for s in site["sections"]:
        s.pop("folder", None)
    json.dump(site, open(os.path.join(OUT, "site.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(dict(quizzes=qz, bonus=bonus), open(os.path.join(OUT, "quizzes.json"), "w"), ensure_ascii=False, indent=0)
    print("verses", len(verses), "episodes", len(episodes), "notes", len(os.listdir(os.path.join(OUT, "notes"))),
          "quizzes", len(qz), "stats", site["stats"])


def dur_s(d):
    p = [int(x) for x in d.split(":")]
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1]


def fix_quiz(qid, parts):
    """Small hand fixes where the PDF layout is ambiguous, and removal of stray markers."""
    junk = re.compile(r"^\s*(\*|_|\|\|\s*Shri Sadguru Charanarpanam Astu\s*\|\|\s*\*?)\s*$")
    for p in parts:
        items = []
        for it in p["items"]:
            it["a"] = [a for a in it["a"] if not junk.match(re.sub(r"<[^>]+>", "", a))]
            if junk.match(it["q"]) or (not it["a"] and "Charanarpanam" in it["q"]):
                continue
            it["q"] = re.sub(r"\s*\|\|\s*Shri Sadguru Charanarpanam Astu\s*\|\|\s*\*?", "", it["q"]).strip()
            items.append(it)
        p["items"] = items
    if qid == "s45":
        for p in parts:
            for it in p["items"]:
                if it["q"].startswith("Feelings can be explained") and it["a"] and it["a"][0].startswith("They do not prove"):
                    it["q"] += " " + it["a"].pop(0)
                if it["q"].startswith("Hydrogen and oxygen") and "This example shows" in it["q"]:
                    q, a = it["q"].split("This example shows", 1)
                    it["q"] = q.strip()
                    it["a"] = ["This example shows" + a] + it["a"]
    return parts


if __name__ == "__main__":
    main()
