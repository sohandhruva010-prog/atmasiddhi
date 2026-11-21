# Shri Atmasiddhi Shastra · A Seeker's Journey

A study companion built from one student's journey through the Shri Atmasiddhi Shastra online course of Shrimad Rajchandra Mission Dharampur. It covers all 142 verses with Gujarati text, transliteration, meanings and word meanings. It links to all 159 satsangs by Pujya Gurudevshri Rakeshji, and holds complete satsang notes, section quizzes with answers, reflections, and the course timeline.

**Live site:** https://sohandhruva010-prog.github.io/atmasiddhi/

These are one student's personal notes, offered in gratitude. They are not an official text.

## Viewing locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Structure

| Path | What it holds |
|---|---|
| `index.html`, `assets/` | The site: vanilla JS with hash routing and no build step |
| `data/site.json` | Sections, verses, satsang list, stats |
| `data/quizzes.json` | Subjective quiz questions and answers |
| `data/notes/*.html` | Satsang notes, one file per satsang |
| `tools/` | Scripts that generate `data/` from the original PDFs |

## Rebuilding the data

The generator reads the original course folder (notes PDFs, quiz PDFs, `Extra/`) and needs PyMuPDF:

```bash
pip install pymupdf
python tools/build.py /path/to/Atmasiddhi
```

- `tools/videos.txt` lists every satsang's YouTube id and duration.
- `tools/manual_quizzes.json` holds the transcribed handwritten Introduction quiz and the bonus "Connect the Verses" quiz.

---

॥ શ્રી સદ્ગુરુ ચરણાર્પણમસ્તુ ॥
