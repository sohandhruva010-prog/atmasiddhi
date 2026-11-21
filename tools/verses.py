"""Parse the 142 verses (title, link, verse text, word meanings, short meaning) and the
IAST transliteration, which uses a legacy 8-bit font encoding."""
import re

import fitz

ORANGE, BROWN = 0xD37831, 0x8A4714

# AS1-TTBidisha legacy font -> Unicode IAST
LEGACY = {
    "¡": "ā", "¢": "ī", "£": "ū", "¸": "ṇ", "À": "ṣ", "¿": "ś", "½": "ḷ", "¶": "ṭ",
    "µ": "ñ", "Ë": "Ā", "á": "Ś", "·": "ḍ", "¤": "ṛ", "Ì": "Ī", "Í": "Ū", "Å": "ḥ",
    "â": "Ṣ", "´": "ṁ", "̇": "",
}


def fix_legacy(t):
    return "".join(LEGACY.get(c, c) for c in t)


def norm(t):
    t = t.replace("�", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


SMALL = {"to", "of", "and", "the", "is", "by", "in", "for", "on", "a", "an", "with", "as", "not", "be", "its", "or", "at"}


def nice_title(t):
    t = re.sub(r"\s*\([^)]*[^\x00-\x7f][^)]*\)", "", t)
    t = re.sub(r"\s*\(\S*[»¶~+][^)]*\)", "", t).strip()
    words = t.lower().split()
    out = []
    for i, w in enumerate(words):
        if i and w in SMALL:
            out.append(w)
        else:
            out.append("-".join(p[:1].upper() + p[1:] for p in w.split("-")))
    return " ".join(out).replace("’S", "’s")


def parse_meanings(path):
    doc = fitz.open(path)
    verses = []
    for pg in doc:
        spans = []
        for b in pg.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                for s in l["spans"]:
                    if s["text"].strip():
                        spans.append((s, l["bbox"]))
        v = dict(n=None, title="", link=[], verse=[], words=[], short=[])
        section, cur = None, None
        last_y = None
        for s, bb in spans:
            t, col, size = s["text"], s["color"], s["size"]
            st = norm(t)
            if col == ORANGE and size > 28:
                m = re.search(r"(\d+)", st)
                v["n"] = int(m.group(1))
                continue
            if col == BROWN and size > 23:
                v["title"] = (v["title"] + " " + st).strip()
                continue
            if col == BROWN and "Bold" in s["font"] and size >= 19:
                up = st.upper()
                if up.startswith("LINK"):
                    section = "link"
                elif up.startswith("WORD"):
                    section = "words"
                elif up.startswith("SHORT"):
                    section = "short"
                cur = None
                continue
            if col == ORANGE:  # verse text
                v["verse"].append(st)
                continue
            if col == BROWN and re.fullmatch(r"\d+\)", st):  # list number
                cur = []
                v[section].append(cur)
                continue
            if section == "short":
                starts_item = t.lstrip(" ").startswith("�") or cur is None
                if st == "":
                    cur = None
                    continue
                if starts_item and t.strip().startswith("�"):
                    cur = []
                    v["short"].append(cur)
                elif cur is None:
                    cur = []
                    v["short"].append(cur)
                cur.append(st)
                continue
            if section in ("link", "words"):
                if cur is None:
                    cur = []
                    v[section].append(cur)
                cur.append(st)
        # Verse lines: join word fragments; split into the two lines at ';'
        vt = " ".join(v["verse"])
        vt = re.sub(r"\s+", " ", vt).strip()
        vt = re.sub(r"\s*\d+\s*$", "", vt)
        parts = [p.strip() for p in re.split(r"(?<=[;?])\s*", vt, maxsplit=1) if p.strip()]
        verses.append(dict(
            n=v["n"],
            title=nice_title(v["title"]),
            link=[" ".join(x) for x in v["link"] if x],
            verse=parts,
            words=[" ".join(x) for x in v["words"] if x],
            short=[" ".join(x) for x in v["short"] if x],
        ))
    return verses


def parse_iast(path):
    """Return {verse_no: [line1, line2]} from the transliteration PDF."""
    doc = fitz.open(path)
    text = "\n".join(pg.get_text() for pg in doc)
    text = fix_legacy(text)
    text = text[text.index("Je svarūpa"):]
    # collapse word-per-line fragments
    out = {}
    buf = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        buf.append(line)
        joined = " ".join(buf)
        m = re.search(r"^(.*?)\s+(\d{1,3})\s*$", joined)
        if m and re.search(r"[;?]", joined):
            n = int(m.group(2))
            body = re.sub(r"\s+", " ", m.group(1)).strip()
            if 1 <= n <= 142 and n not in out:
                body = re.sub(r"^\S*kathana\s+", "", body).replace("mauntā", "maunatā")
                halves = [h.strip() for h in re.split(r"(?<=[;?])\s*", body, maxsplit=1)]
                out[n] = halves
            buf = []
        elif len(buf) > 12:
            buf = buf[-6:]
        elif line.endswith(".") and not re.search(r"[;?]", joined):
            buf = []
    return out


# ---------------------------------------------------------------- IAST -> Gujarati
_CONS = [
    ("kh", "ખ"), ("gh", "ઘ"), ("ch", "છ"), ("jh", "ઝ"), ("ṭh", "ઠ"), ("ḍh", "ઢ"),
    ("th", "થ"), ("dh", "ધ"), ("ph", "ફ"), ("bh", "ભ"),
    ("k", "ક"), ("g", "ગ"), ("ṅ", "ઙ"), ("c", "ચ"), ("j", "જ"), ("ñ", "ઞ"),
    ("ṭ", "ટ"), ("ḍ", "ડ"), ("ṇ", "ણ"), ("t", "ત"), ("d", "દ"), ("n", "ન"),
    ("p", "પ"), ("b", "બ"), ("m", "મ"), ("y", "ય"), ("r", "ર"), ("l", "લ"),
    ("v", "વ"), ("ś", "શ"), ("ṣ", "ષ"), ("s", "સ"), ("h", "હ"), ("ḷ", "ળ"),
]
_VOW = [("ai", "ઐ", "ૈ"), ("au", "ઔ", "ૌ"), ("ā", "આ", "ા"), ("ī", "ઈ", "ી"),
        ("ū", "ઊ", "ૂ"), ("ṛ", "ઋ", "ૃ"), ("a", "અ", ""), ("i", "ઇ", "િ"),
        ("u", "ઉ", "ુ"), ("e", "એ", "ે"), ("o", "ઓ", "ો")]
_DIG = str.maketrans("0123456789", "૦૧૨૩૪૫૬૭૮૯")


def to_gujarati(s):
    s = s.replace("ṁ", "ṁ")
    s = s.lower()
    out, i, prev_cons = [], 0, False
    while i < len(s):
        for lat, g in _CONS:
            if s.startswith(lat, i):
                if prev_cons:
                    out.append("્")
                out.append(g)
                prev_cons = True
                i += len(lat)
                break
        else:
            for lat, ind, mat in _VOW:
                if s.startswith(lat, i):
                    out.append(mat if prev_cons else ind)
                    prev_cons = False
                    i += len(lat)
                    break
            else:
                ch = s[i]
                if prev_cons and ch.isalpha() is False and ch not in "ṁḥ":
                    out.append("્")
                prev_cons = False
                out.append({"ṁ": "ં", "ḥ": "ઃ"}.get(ch, ch))
                i += 1
    if prev_cons:
        out.append("્")
    return "".join(out).translate(_DIG)


def parse_stuti(path):
    """The Mangalacharan (Stuti) stanzas that open the transliteration PDF."""
    doc = fitz.open(path)
    text = fix_legacy("\n".join(pg.get_text() for pg in doc))
    text = text[: text.index("Stuti")]
    stanzas, lines, buf = [], [], ""
    for raw in text.split("\n"):
        t = raw.strip()
        if not t or t.startswith("Śrī Ātmasiddhi"):
            continue
        buf = (buf + " " + t).strip()
        if re.search(r"[,;.]\s*$|\d\s*$", buf):
            m = re.search(r"\s+(\d)\s*$", buf)
            if m:
                buf = buf[: m.start()].strip()
            lines.append(buf.replace("Am bālāle", "Aṁbālāle").replace("Am bālāle", "Aṁbālāle"))
            buf = ""
            if m:
                stanzas.append(lines)
                lines = []
    return [dict(iast=st, gu=[to_gujarati(x) for x in st]) for st in stanzas]
