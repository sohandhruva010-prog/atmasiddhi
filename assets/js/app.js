/* Shri Atmasiddhi Shastra — a seeker's journey. Vanilla JS, hash routing, no build step. */
(() => {
  "use strict";

  const TRUTHS = [
    { rn: "I", gu: "આત્મા છે", ia: "Ātmā che", en: "The Soul Exists", d: "Beyond the senses, the knower of all that is known. The disciple's three doubts meet the Guru's three replies.", sec: "s5", r: "Verses 45 – 58" },
    { rn: "II", gu: "તે નિત્ય છે", ia: "Te nitya che", en: "The Soul is Eternal", d: "Neither produced by combination nor destroyed with the body — the witness of birth and death.", sec: "s6", r: "Verses 59 – 70" },
    { rn: "III", gu: "છે કર્તા નિજકર્મ", ia: "Che kartā nijakarma", en: "The Soul is the Doer", d: "Not God, not matter, not karma itself — the soul's own impure tendency binds karma.", sec: "s7", r: "Verses 71 – 78" },
    { rn: "IV", gu: "છે ભોક્તા", ia: "Che bhoktā", en: "The Soul is the Enjoyer", d: "Karma fructifies by its own nature; nothing in the universe happens without a cause.", sec: "s8", r: "Verses 79 – 86" },
    { rn: "V", gu: "વળી મોક્ષ છે", ia: "Vaḷī mokṣa che", en: "Liberation Exists", d: "As doership of karma is fruitful, so is cessation from it — that fruit is liberation.", sec: "s9", r: "Verses 87 – 91" },
    { rn: "VI", gu: "મોક્ષ ઉપાય સુધર્મ", ia: "Mokṣa upāya sudharma", en: "The Path of Liberation", d: "Knowledge dispels ignorance; true religion is the soul's own pure nature, the same for all.", sec: "s10", r: "Verses 92 – 118" },
  ];

  // ------------------------------------------------------------------ helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const main = $("#main");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const guDigits = (n) => String(n).replace(/\d/g, (d) => "૦૧૨૩૪૫૬૭૮૯"[d]);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const fmtDate = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const secs = (d) => d.split(":").map(Number).reduce((a, b) => a * 60 + b, 0);
  const hrs = (s) => (s / 3600).toFixed(1);

  let SITE, QUIZ;
  let ctl = new AbortController(); // listeners bound to the current page only
  const noteCache = new Map();
  const getQuiz = async () => QUIZ || (QUIZ = await fetch("data/quizzes.json").then((r) => r.json()));
  const getNote = async (id) => {
    if (!noteCache.has(id)) noteCache.set(id, fetch(`data/notes/${id}.html`).then((r) => (r.ok ? r.text() : "")));
    return noteCache.get(id);
  };
  const sec = (id) => SITE.sections.find((s) => s.id === id);
  const secLabel = (s) => (s.n ? `Section ${s.n}` : "Introduction");
  const rangeLabel = (s) => (s.range ? (s.range[0] === s.range[1] ? `Verse ${s.range[0]}` : `Verses ${s.range[0]} – ${s.range[1]}`) : "Sessions 1 – 6");

  function laurel(flip) {
    const P = [[30, 300], [4, 210], [6, 100], [44, 8]];
    const bz = (t) => {
      const u = 1 - t;
      return [0, 1].map((k) => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]);
    };
    let leaves = "";
    for (let i = 1; i <= 13; i++) {
      const t = i / 14, [x, y] = bz(t), [x2, y2] = bz(t + 0.01);
      const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI + 90;
      const side = i % 2 ? 1 : -1, sz = 1 - t * 0.45;
      leaves += `<ellipse cx="${x + side * 9 * sz}" cy="${y}" rx="${4.2 * sz}" ry="${12 * sz}" transform="rotate(${ang + side * 38} ${x + side * 9 * sz} ${y})" fill="currentColor"/>`;
    }
    return `<svg class="laurel" viewBox="-20 0 90 310" style="${flip ? "transform:scaleX(-1);" : ""}" aria-hidden="true"><path d="M30 300 C4 210 6 100 44 8" stroke="currentColor" stroke-width="1.6" fill="none"/>${leaves}</svg>`;
  }
  const orn = (cls = "") => `<div class="orn ${cls}"><i>◆</i></div>`;
  const pageHead = (eyebrow, title, lede) => `
    <header class="page-head fade-in"><div class="wrap">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="display">${title}</h1>
      ${orn()}
      ${lede ? `<p class="lede">${lede}</p>` : ""}
    </div></header>`;

  function videoBox(yt, label) {
    return `<div class="video" data-yt="${yt}" style="background-image:url(https://i.ytimg.com/vi/${yt}/hqdefault.jpg)">
      <button class="play" aria-label="Play satsang video"><i></i></button>
      ${label ? `<div class="vmeta">${esc(label)}</div>` : ""}
    </div>`;
  }
  document.addEventListener("click", (e) => {
    const v = e.target.closest(".video[data-yt]");
    if (v && !v.querySelector("iframe")) {
      v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0&modestbranding=1" title="Satsang video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    }
    const j = e.target.closest("[data-jump]");
    if (j) {
      e.preventDefault();
      const t = document.getElementById(j.dataset.jump);
      if (t) window.scrollTo({ top: t.getBoundingClientRect().top + scrollY - 130, behavior: "smooth" });
    }
  });

  async function renderNotes(el, id) {
    el.innerHTML = `<p class="loading">Opening the notes…</p>`;
    const html = await getNote(id);
    if (!html) { el.innerHTML = `<p class="empty">No notes for this satsang.</p>`; return; }
    el.innerHTML = `<nav class="toc" aria-label="Contents"></nav><article class="notes">${html}</article>`;
    const heads = $$(".notes h3", el);
    if (heads.length >= 3) {
      $(".toc", el).innerHTML = heads.map((h, i) => {
        h.id = `n${i}`;
        const t = h.textContent.replace(/^\s*[\d.\)]+\s*/, "").replace(/^[\d:–-]+\s*—\s*/, "");
        return `<a href="#" data-jump="n${i}" title="${esc(t)}">${esc(t.length > 46 ? t.slice(0, 44) + "…" : t)}</a>`;
      }).join("");
    } else $(".toc", el).remove();
  }

  // ------------------------------------------------------------------ HOME
  function home() {
    const v1 = SITE.verses[0], v142 = SITE.verses[141], st = SITE.stats;
    const path = SITE.sections.map((s) => `
      <a class="pcard reveal${s.n ? "" : " prelude"}" href="${s.n ? "#/verses/" + s.id : "#/shastra"}">
        <span class="no">${s.n ? "Section " + String(s.n).padStart(2, "0") : "Prelude"}</span>
        <h3>${esc(s.name)}</h3>
        <span class="ia">${esc(s.iast)}</span>
        <span class="meta"><span>${rangeLabel(s)}</span><span>${SITE.episodes.filter((e) => e.section === s.id).length} satsangs</span></span>
      </a>`).join("");
    main.innerHTML = `
      <section class="hero">
        <div class="hero-img"><img src="assets/img/hero.jpg" alt="Pujya Gurudevshri seated before a relief of Param Krupalu Dev Shrimad Rajchandraji"></div>
        <div class="wrap"><div class="hero-copy fade-in">
          <p class="eyebrow">Param Krupalu Dev · Shrimad Rajchandraji</p>
          <h1 class="display"><span>Śrī</span>Ātmasiddhi<br>Śāstra</h1>
          <div class="orn left"><i>◆</i></div>
          <p class="lede">The six spiritual truths of the soul — one hundred and forty-two verses that reveal the path to liberation.</p>
          <p class="by">Studied through the satsangs of <b>Pujya Gurudevshri</b>. Every verse, every note, every answer — gathered here.</p>
          <div class="cta"><a class="btn" href="#/verse/1">Begin with Verse 1</a><a class="btn ghost" href="#/verses">All 142 verses</a></div>
        </div></div>
        <div class="scroll-cue">Scroll</div>
      </section>

      <section class="section showcase"><div class="read">
        <p class="vnum reveal">VERSE I · ${esc(v1.title.toUpperCase())}</p>
        <div class="gu-verse gu reveal">${v1.gu.join("<br>")}</div>
        <div class="iast reveal">${v1.iast.join("<br>")}</div>
        ${orn("reveal")}
        <p class="meaning reveal">${esc(v1.short.join(" "))}</p>
        <p class="reveal" style="margin-top:28px"><a class="btn ghost sm" href="#/verse/1">Read Verse 1 with notes</a></p>
      </div></section>

      <section class="wrap"><div class="stats reveal">
        <div class="stat"><b>142</b><span>Verses</span></div>
        <div class="stat"><b>${st.satsangs}</b><span>Satsangs</span></div>
        <div class="stat"><b>${Math.round(st.hours)}</b><span>Hours of discourse</span></div>
        <div class="stat"><b>${st.notePages.toLocaleString()}</b><span>Pages of notes</span></div>
        <div class="stat"><b>${st.questions}</b><span>Questions answered</span></div>
        <div class="stat"><b>${st.quizzes}</b><span>Quizzes</span></div>
      </div></section>

      <section class="section"><div class="wrap center">
        <p class="eyebrow reveal">Ṣaṭpada · Verse 43</p>
        <h2 class="display reveal" style="font-size:clamp(30px,4.6vw,54px)">The Six Fundamental Truths</h2>
        ${orn("reveal")}
        <p class="lede reveal" style="max-width:700px;margin:0 auto">“The soul exists, it is eternal, it is the doer of its karma, it is the enjoyer, liberation exists, and there is a path to liberation.”</p>
        <div class="truths">${TRUTHS.map((t) => `
          <a class="truth reveal" href="#/verses/${t.sec}" style="text-align:left">
            <span class="rn">${t.rn}</span>
            <div class="gu">${t.gu}</div><div class="tl">${t.ia}</div>
            <h3>${t.en}</h3><p>${t.d}</p><div class="rg">${t.r}</div>
          </a>`).join("")}</div>
      </div></section>

      <section class="section" style="padding-top:0"><div class="wrap">
        <div class="center"><p class="eyebrow reveal">The architecture of the Shastra</p>
        <h2 class="display reveal" style="font-size:clamp(30px,4.6vw,54px)">Twelve Movements</h2>${orn("reveal")}</div>
        <div class="path">${path}</div>
      </div></section>

      <section class="trust"><div class="trust-in">
        ${laurel(false)}
        <div class="trust-text">
          <div class="orn reveal"><i>◆</i></div>
          <p class="reveal"><span>Trust Him</span><span>Trust His Timing</span><span>Trust His Ways</span></p>
          <div class="orn reveal"><i>◆</i></div>
        </div>
        ${laurel(true)}
      </div></section>

      <section class="lang-band"><div class="wrap lang-grid">
        <div class="lang-img reveal"><img src="assets/img/books-60.jpg" alt="Shrimad Rajchandraji's Atmasiddhi Shastra in 60 languages — a stack of navy clothbound volumes" loading="lazy"></div>
        <div class="lang-copy">
          <p class="eyebrow reveal">Shrimad Rajchandraji's</p>
          <h2 class="display reveal">Ātmasiddhi Śāstra<small>in sixty languages</small></h2>
          ${orn("left reveal")}
          <p class="lede reveal">Written in a single night at Nadiad for a handful of worthy seekers — the same 142 verses now speak to seekers across the world, each in their own tongue.</p>
          <div class="cta reveal"><a class="btn ghost" href="#/shastra">The story of the Shastra</a></div>
        </div>
      </div></section>

      <section class="section showcase" style="padding-top:20px"><div class="read">
        <p class="vnum reveal">VERSE 142 · THE FINAL SALUTATION</p>
        <div class="gu-verse gu reveal">${v142.gu.join("<br>")}</div>
        <div class="iast reveal">${v142.iast.join("<br>")}</div>
        ${orn("reveal")}
        <p class="meaning reveal">${esc(v142.short.join(" "))}</p>
        <div class="cta reveal" style="justify-content:center"><a class="btn" href="#/reflections">Reflections</a><a class="btn ghost" href="#/quizzes">The Quizzes</a></div>
      </div></section>`;
  }

  // ------------------------------------------------------------------ THE SHASTRA
  function shastra() {
    const intro = SITE.episodes.filter((e) => e.kind === "intro");
    const st = SITE.stuti || [];
    main.innerHTML = `
      ${pageHead("Param Krupalu Dev · Shrimad Rajchandraji", "The Shastra", "A rare jewel in Gujarati verse — composed out of compassion, in a single sitting, for those who seek only the Self.")}
      <section class="wrap">
        <div class="facts reveal">
          <div class="fact"><b>1896</b><span>22 October · Aso Vad Ekam, V.S. 1952</span></div>
          <div class="fact"><b>Nadiad</b><span>Charotar, Gujarat</span></div>
          <div class="fact"><b>142</b><span>verses in the dohā metre</span></div>
          <div class="fact"><b>One Sitting</b><span>about two hours, by lantern light</span></div>
        </div>
      </section>
      <section class="section" style="padding-bottom:20px"><div class="wrap">
        <figure class="plate reveal">
          <div class="plate-img"><img src="assets/img/nadiad-1896.jpg" alt="Param Krupalu Dev writing Shri Atmasiddhi Shastra at a low desk while Pujya Ambalalbhai holds a lantern, with Pujya Saubhagbhai present in spirit" loading="lazy"></div>
          <figcaption><b>Nadiad · Aso Vad Ekam · 1896</b>Param Krupalu Dev writes the 142 verses in one sitting; Pujya Ambalalbhai holds the lantern; Pujya Saubhagbhai, at whose request it was written, is present in spirit.</figcaption>
        </figure>
      </div></section>
      <section class="section" style="padding-top:30px"><div class="read prose">
        <p class="eyebrow reveal">The name</p>
        <p class="drop reveal"><strong>Shri</strong> marks what is holy: this is not an ordinary book, but sacred scripture written by an Enlightened Master. <strong>Atma</strong> is the soul — eternal, full of knowledge, distinct from body and mind; the whole Shastra turns on it. <strong>Siddhi</strong> is attainment: realising and experiencing the soul directly, free from ignorance and bondage. <strong>Shastra</strong> is a text that teaches truth through reason, example and explanation. Together: <em>the sacred scripture for attaining the Self.</em></p>
        <p class="reveal">Its form is a dialogue. A sincere disciple voices every doubt about the soul — the very doubts that rise in our own minds — and an Enlightened Guru answers each with logic and compassion, until the disciple's own realisation pours out in gratitude.</p>
        <p class="eyebrow reveal" style="margin-top:44px">The worthy receivers</p>
        <div class="trio">
          <div class="reveal"><h3>Saubhagbhai</h3><p>of Sayla — whose humble request led to the composition.</p></div>
          <div class="reveal"><h3>Ambalalbhai</h3><p>of Khambhat — who stood beside Him holding the lantern as He wrote.</p></div>
          <div class="reveal"><h3>Lalluji Muni</h3><p>Shri Laghuraj Swami — on whose birthday, Aso Vad Ekam, it was composed.</p></div>
        </div>
      </div></section>
      ${st.length ? `<section class="section" style="padding-top:0"><div class="read">
        <div class="frame stuti reveal">
          <p class="eyebrow">Mangalācharaṇ · by Shri Lalluji Muni</p>
          <h2 class="display" style="font-size:clamp(24px,3.4vw,38px)">Patita Jana Pāvanī</h2>${orn()}
          ${st.map((s, i) => `<div class="gu">${s.gu.join("<br>")} ॥${guDigits(i + 1)}॥</div><div class="iast">${s.iast.join("<br>")}</div>${i < st.length - 1 ? orn() : ""}`).join("")}
          <p style="margin:26px 0 0;color:var(--muted);font-size:17px">The scripture is likened to the Ganga that purifies the fallen, brought down — as Bhagiratha brought the river — by the fortunate Saubhagbhai's request; composed by Param Krupalu Dev at Nadiad with Ambalalbhai holding the lamp.</p>
        </div>
      </div></section>` : ""}
      <section class="section book-sec"><div class="wrap book-grid">
        <figure class="book reveal"><img src="assets/img/commentary.jpg" alt="Atmasiddhi Shastra — Six Spiritual Truths of the Soul, concise and complete commentary by Pujya Gurudevshri Rakeshji" loading="lazy"></figure>
        <div>
          <p class="eyebrow reveal">The commentary</p>
          <h2 class="display reveal" style="font-size:clamp(28px,3.8vw,46px)">Six Spiritual Truths of the Soul</h2>
          ${orn("left reveal")}
          <p class="lede reveal">Unveiling its timeless wisdom, Pujya Gurudevshri Rakeshji penned a concise and complete commentary on all 142 verses in English.</p>
          <p class="reveal" style="color:var(--muted)">Each verse is opened word by word, then in meaning, then in the light of practice — the same three movements that shape every verse page here: the word meanings, the short meaning, and the satsang notes.</p>
          <div class="cta reveal"><a class="btn" href="#/verse/1">Begin with Verse 1</a></div>
        </div>
      </div></section>
      <section class="section" style="padding-top:0"><div class="wrap">
        <div class="center"><p class="eyebrow reveal">Before the first verse</p><h2 class="display reveal" style="font-size:clamp(28px,4vw,46px)">The Introductory Satsangs</h2>${orn("reveal")}</div>
        <ul class="ep-list read" style="margin-top:20px">${intro.map(epRow).join("")}</ul>
      </div></section>
      <section class="section" style="padding-top:0"><div class="wrap center">
        <a class="btn reveal" href="#/verses">Enter the 142 verses</a>
      </div></section>`;
  }

  // ------------------------------------------------------------------ VERSES INDEX
  function versesIndex(filter) {
    const active = filter && sec(filter) ? filter : "all";
    main.innerHTML = `
      ${pageHead("Gāthā · 142 verses", "The Verses", "Gujarati, transliteration, word-to-word meaning, the short meaning, the satsang, and the notes taken while listening.")}
      <section class="wrap">
        <div class="toolbar">
          <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input id="q" type="search" placeholder="Search a verse — number, word, meaning…" autocomplete="off" aria-label="Search verses"></label>
          <div class="chips" id="chips">
            <button class="chip ${active === "all" ? "on" : ""}" data-f="all">All</button>
            ${SITE.sections.filter((s) => s.range).map((s) => `<button class="chip ${active === s.id ? "on" : ""}" data-f="${s.id}">${s.n}. ${esc(s.name.split(" — ")[0])}</button>`).join("")}
          </div>
        </div>
        <div id="vlist"></div>
      </section>`;
    const idx = SITE.verses.map((v) => ({ v, hay: fold([v.n, v.title, ...v.tr, ...v.iast, ...v.short, ...v.words.map((w) => w.join(" "))].join(" ")) }));
    let f = active;
    const draw = () => {
      const q = fold($("#q").value.trim());
      const groups = SITE.sections.filter((s) => s.range && (f === "all" || f === s.id)).map((s) => {
        const vs = idx.filter((x) => x.v.section === s.id && (!q || (/^\d+$/.test(q) ? String(x.v.n) === q : x.hay.includes(q)))).map((x) => x.v);
        if (!vs.length) return "";
        return `<div class="sec-block">
          <div class="sec-title"><span class="no">${secLabel(s)}</span><h2>${esc(s.name)}</h2><span class="ia">${esc(s.iast)}</span><span class="r">${rangeLabel(s)}</span></div>
          <div class="vgrid">${vs.map((v) => `<a class="vcard" href="#/verse/${v.n}"><div class="n">${v.n}<small>VERSE</small></div><div><h3>${esc(v.title)}</h3><p>${esc(v.tr[0] || "")}</p></div></a>`).join("")}</div>
        </div>`;
      }).join("");
      $("#vlist").innerHTML = groups || `<p class="empty">No verse matches “${esc($("#q").value)}”.</p>`;
    };
    $("#q").addEventListener("input", draw);
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      f = b.dataset.f; $$(".chip").forEach((c) => c.classList.toggle("on", c === b));
      history.replaceState(null, "", f === "all" ? "#/verses" : `#/verses/${f}`);
      draw();
    });
    draw();
  }

  // ------------------------------------------------------------------ VERSE PAGE
  function versePage(n, tab) {
    const v = SITE.verses[n - 1];
    if (!v) return notFound();
    const s = sec(v.section);
    const prev = SITE.verses[n - 2], next = SITE.verses[n];
    tab = ["meaning", "notes", "watch"].includes(tab) ? tab : "meaning";
    main.innerHTML = `
      <section class="vhead fade-in"><div class="wrap">
        <div class="crumbs"><a href="#/verses">Verses</a> · <a href="#/verses/${s.id}">${secLabel(s)} · ${esc(s.name)}</a></div>
        <div class="big display">${n}</div>
        <h1>${esc(v.title)}</h1>
        ${orn()}
        <div class="verse-card">
          <div class="gu">${v.gu.join("<br>")} ॥${guDigits(n)}॥</div>
          <div class="iast">${v.iast.join("<br>")}</div>
          <div class="tr">${v.tr.map(esc).join("<br>")}</div>
        </div>
      </div></section>
      <div class="read">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" data-t="meaning">Meaning</button>
          <button class="tab" role="tab" data-t="notes">Satsang Notes</button>
          <button class="tab" role="tab" data-t="watch">Watch</button>
        </div>
        <div class="panel" id="p-meaning">
          ${v.link.length ? `<h2>The Link · Sambandh</h2><ol class="link-list">${v.link.map((l) => `<li>${esc(l)}</li>`).join("")}</ol>` : ""}
          <h2>Word to Word · Śabdārth</h2>
          <table class="words"><tbody>${v.words.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>
          <h2>Short Meaning</h2>
          <blockquote class="short">${v.short.map((x) => `<p>${esc(x)}</p>`).join("")}</blockquote>
          <p style="margin-top:34px;text-align:center"><button class="btn ghost sm" data-go="notes">Read my satsang notes →</button></p>
        </div>
        <div class="panel" id="p-notes" hidden></div>
        <div class="panel" id="p-watch" hidden>
          ${videoBox(v.yt, `Verse ${n} · ${v.dur}`)}
          <p style="text-align:center;margin-top:18px;color:var(--muted);font-size:16px">Satsang by Pujya Gurudevshri · <a href="https://www.youtube.com/watch?v=${v.yt}&list=${SITE.playlist}" target="_blank" rel="noopener">Open on YouTube</a></p>
        </div>
        <nav class="pager">
          ${prev ? `<a href="#/verse/${prev.n}"><small>← Verse ${prev.n}</small><span>${esc(prev.title)}</span></a>` : `<span class="ph"></span>`}
          ${next ? `<a class="next" href="#/verse/${next.n}"><small>Verse ${next.n} →</small><span>${esc(next.title)}</span></a>` : `<a class="next" href="#/reflections"><small>Complete →</small><span>Reflections</span></a>`}
        </nav>
      </div>`;
    let notesLoaded = false;
    const show = (t, push) => {
      $$(".tab").forEach((b) => { b.classList.toggle("on", b.dataset.t === t); b.setAttribute("aria-selected", b.dataset.t === t); });
      ["meaning", "notes", "watch"].forEach((k) => ($(`#p-${k}`).hidden = k !== t));
      if (t === "notes" && !notesLoaded) { notesLoaded = true; v.notes ? renderNotes($("#p-notes"), `v${n}`) : ($("#p-notes").innerHTML = `<p class="empty">No notes for this verse.</p>`); }
      if (push) {
        history.replaceState(null, "", `#/verse/${n}${t === "meaning" ? "" : "/" + t}`);
        const top = $(".tabs").getBoundingClientRect().top + scrollY - 70;
        if (scrollY > top) window.scrollTo({ top, behavior: "smooth" });
      }
    };
    $(".tabs").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) show(b.dataset.t, true); });
    $("[data-go]").addEventListener("click", () => show("notes", true));
    show(tab, false);
  }

  // ------------------------------------------------------------------ SATSANGS
  function epHref(e) { return e.kind === "verse" ? `#/verse/${e.n}/notes` : `#/satsang/${e.id}`; }
  function epRow(e) {
    return `<li><a class="ep" href="${epHref(e)}"><span class="lb">${esc(e.label)}</span><span class="t">${esc(e.title)}${e.notes ? `<span class="badge">NOTES</span>` : ""}</span><span class="d">${e.dur}</span></a></li>`;
  }
  function satsangs() {
    const st = SITE.stats;
    main.innerHTML = `
      ${pageHead("Pujya Gurudevshri · Jñāna Yajña", "The Satsangs", `${st.satsangs} discourses, ${Math.round(st.hours)} hours — in the order they were heard, each with its notes.`)}
      <section class="wrap">${SITE.sections.map((s) => {
        const eps = SITE.episodes.filter((e) => e.section === s.id);
        const t = eps.reduce((a, e) => a + secs(e.dur), 0);
        return `<div class="sec-block reveal">
          <div class="sec-title"><span class="no">${secLabel(s)}</span><h2>${esc(s.name)}</h2><span class="r">${eps.length} satsangs · ${hrs(t)} hrs</span></div>
          <ul class="ep-list">${eps.map(epRow).join("")}</ul></div>`;
      }).join("")}
        <p class="center reveal" style="margin-top:50px"><a class="btn ghost" href="https://www.youtube.com/playlist?list=${SITE.playlist}" target="_blank" rel="noopener">Open the full playlist on YouTube</a></p>
      </section>`;
  }
  function satsangPage(id) {
    const i = SITE.episodes.findIndex((e) => e.id === id);
    const e = SITE.episodes[i];
    if (!e) return notFound();
    if (e.kind === "verse") return versePage(e.n, "notes");
    const s = sec(e.section), prev = SITE.episodes[i - 1], next = SITE.episodes[i + 1];
    main.innerHTML = `
      <section class="vhead fade-in"><div class="wrap">
        <div class="crumbs"><a href="#/satsangs">Satsangs</a> · ${secLabel(s)} · ${esc(s.name)}</div>
        <p class="eyebrow" style="margin-top:22px">${esc(e.label)}</p>
        <h1 class="display" style="font-size:clamp(30px,5vw,58px)">${esc(e.title)}</h1>
        ${orn()}
      </div></section>
      <div class="read">
        ${videoBox(e.yt, `${e.label} · ${e.dur}`)}
        <div class="panel" id="p-notes"></div>
        <nav class="pager">
          ${prev ? `<a href="${epHref(prev)}"><small>← ${esc(prev.label)}</small><span>${esc(prev.title)}</span></a>` : `<span class="ph"></span>`}
          ${next ? `<a class="next" href="${epHref(next)}"><small>${esc(next.label)} →</small><span>${esc(next.title)}</span></a>` : `<span class="ph"></span>`}
        </nav>
      </div>`;
    e.notes ? renderNotes($("#p-notes"), e.id) : ($("#p-notes").innerHTML = `<p class="empty">The notes for this satsang are included with the neighbouring session.</p>`);
  }

  // ------------------------------------------------------------------ QUIZZES
  function quizMeta(q) {
    const ss = q.sections.map(sec);
    const nm = { s10a: "Part A · Verses 92 – 107", s10b: "Part B · Verses 108 – 118" }[q.id];
    const title = q.id === "intro" ? "An Introduction to the Shastra" : q.id === "s45" ? "Naming the Truths & The Soul Exists" : ss[0].name.replace(/^.*? — /, "");
    const no = q.id === "intro" ? "Introduction" : q.id === "s45" ? "Sections 4 & 5" : `Section ${ss[0].n}${q.id === "s10a" ? " · A" : q.id === "s10b" ? " · B" : ""}`;
    const range = nm || (q.id === "s45" ? "Verses 43 – 58" : rangeLabel(ss[0]));
    return { title, no, range, count: q.parts.reduce((a, p) => a + p.items.length, 0) };
  }
  const noMarks = (t) => String(t).replace(/\s*\(\s*\d+\s*marks?(\s*each)?\s*\)/i, "").trim();
  // Two ways into every page of questions: the written answers, or a blank page to answer oneself.
  const modeSwitch = (a, b) => `<div class="center"><div class="mode" role="group" aria-label="View"><button data-m="read" class="on" aria-pressed="true">${a}</button><button data-m="practice" aria-pressed="false">${b}</button></div></div>`;
  function bindMode() {
    $(".mode").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      document.body.classList.toggle("practice", b.dataset.m === "practice");
      $$(".mode button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); });
    });
    main.addEventListener("input", (e) => { const t = e.target.closest("textarea[data-k]"); if (t) store.set(t.dataset.k, t.value); }, { signal: ctl.signal });
  }
  async function quizIndex() {
    main.innerHTML = `${pageHead("Subjective assessments", "The Quizzes", "At the close of every section — questions to answer in one's own words. These are the answers that were written.")}<section class="wrap"><p class="loading">Loading…</p></section>`;
    const Q = await getQuiz();
    $("section.wrap", main).innerHTML = `<div class="qgrid">${Q.quizzes.map((q) => {
      const m = quizMeta(q);
      return `<a class="qcard reveal" href="#/quiz/${q.id}"><span class="no">${m.no}</span><h3>${esc(m.title)}</h3><p>${m.range}</p>
        <span class="meta"><span>${m.count} questions</span>${q.date ? `<span>${fmtDate(q.date)}</span>` : ""}</span></a>`;
    }).join("")}
      <a class="qcard reveal" href="#/quiz/bonus" style="background:linear-gradient(165deg,rgba(214,180,108,.16),rgba(8,20,48,.5))"><span class="no">Section 12 · Bonus</span><h3>Connect the Verses</h3><p>Two hints, one Gujarati word — from the Conclusion</p>
        <span class="meta"><span>${Q.bonus.items.length} puzzles</span><span>Interactive</span></span></a>
    </div>`;
    observe();
  }
  async function quizPage(id) {
    main.innerHTML = `<p class="loading" style="padding-top:160px">Loading…</p>`;
    const Q = await getQuiz();
    if (id === "bonus") return bonusPage(Q.bonus);
    const qi = Q.quizzes.findIndex((q) => q.id === id), q = Q.quizzes[qi];
    if (!q) return notFound();
    const m = quizMeta(q), next = Q.quizzes[qi + 1];
    let k = 0;
    main.innerHTML = `
      ${pageHead(`${m.no} · ${m.range}`, esc(m.title), `${m.count} questions${q.date ? ` · submitted ${fmtDate(q.date)}` : ""}`)}
      <section class="read">
        ${modeSwitch("The Seeker’s Pen", "Enter the Inquiry")}
        ${q.parts.map((p) => `
          <div class="qpart"><div class="qpart-h"><h2>${esc(noMarks(p.title))}</h2></div>
          ${p.items.map((it) => { k++; const key = `asq:${q.id}:${k}`; return `
            <div class="qa" data-k="${key}">
              <div class="q"><b>${String(k).padStart(2, "0")}</b><span>${it.q}</span></div>
              <div class="practice"><textarea data-k="${key}" placeholder="Write your own answer… (saved in this browser)">${esc(store.get(key) || "")}</textarea><button class="btn ghost sm reveal-btn">Unveil my answer</button></div>
              <div class="a"><span class="who">MY ANSWER</span>${it.a.map((x) => `<p>${x}</p>`).join("")}</div>
            </div>`; }).join("")}
          </div>`).join("")}
        <nav class="pager">
          <a href="#/quizzes"><small>← All quizzes</small><span>The Quizzes</span></a>
          ${next ? `<a class="next" href="#/quiz/${next.id}"><small>Next →</small><span>${esc(quizMeta(next).no)}</span></a>` : `<a class="next" href="#/quiz/bonus"><small>Next →</small><span>Connect the Verses</span></a>`}
        </nav>
      </section>`;
    bindMode();
    main.addEventListener("click", (e) => { const b = e.target.closest(".reveal-btn"); if (b) { const qa = b.closest(".qa"); qa.classList.toggle("shown"); b.textContent = qa.classList.contains("shown") ? "Veil it again" : "Unveil my answer"; } }, { signal: ctl.signal });
  }
  function bonusPage(B) {
    main.innerHTML = `
      ${pageHead("Section 12 · Upasaṁhāra", "Connect the Verses", esc(B.intro))}
      <section class="read">
        <div class="bq" style="border-color:var(--line)"><span class="eyebrow" style="font-size:10px">Example</span>
          <div class="h"><b>HINT I</b><span>${esc(B.example.h1)}</span></div><div class="h"><b>HINT II</b><span>${esc(B.example.h2)}</span></div>
          <div class="res ok">Answer: ${esc(B.example.a)}</div></div>
        <div class="bonus" style="margin-top:14px">${B.items.map((it, i) => `
          <div class="bq"><span class="eyebrow" style="font-size:10px">Puzzle ${i + 1}</span>
            <div class="h"><b>HINT I</b><span>${esc(it.h1)}</span></div><div class="h"><b>HINT II</b><span>${esc(it.h2)}</span></div>
            <form data-a="${esc(it.a)}"><input placeholder="The Gujarati word…" aria-label="Your answer"><button class="btn sm">Check</button><button type="button" class="btn ghost sm" data-show>Reveal</button></form>
            <div class="res"></div></div>`).join("")}</div>
        <nav class="pager"><a href="#/quizzes"><small>← All quizzes</small><span>The Quizzes</span></a><a class="next" href="#/reflections"><small>Next →</small><span>Reflections</span></a></nav>
      </section>`;
    main.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target, res = f.nextElementSibling, ok = fold(f.querySelector("input").value.trim()).replace(/[^a-z]/g, "") === fold(f.dataset.a).replace(/[^a-z]/g, "");
      res.className = "res " + (ok ? "ok" : "no");
      res.textContent = ok ? `Yes — ${f.dataset.a}.` : "Not quite. Reflect on the two hints together.";
    }, { signal: ctl.signal });
    main.addEventListener("click", (e) => { const b = e.target.closest("[data-show]"); if (b) { const f = b.closest("form"), r = f.nextElementSibling; r.className = "res ok"; r.textContent = `Answer: ${f.dataset.a}`; } }, { signal: ctl.signal });
  }

  // ------------------------------------------------------------------ REFLECTIONS
  async function reflections() {
    main.innerHTML = `${pageHead("Self-reflection · inner inquiry", "Reflections", "Where the teaching turned inward. The reflective questions from each section, and what came up in answering them.")}<section class="read"><p class="loading">Loading…</p></section>`;
    const Q = await getQuiz();
    const groups = Q.quizzes.map((q) => ({ q, m: quizMeta(q), items: q.parts.filter((p) => /reflect|inner inquiry|introspect/i.test(p.title)).flatMap((p) => p.items) })).filter((g) => g.items.length);
    const total = groups.reduce((a, g) => a + g.items.length, 0);
    $("section.read", main).innerHTML = `
      <p class="center" style="color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:.3em;margin:0 0 10px">${total} REFLECTIONS · ${groups.length} SECTIONS</p>
      <div class="chips" id="rchips" style="justify-content:center;flex-wrap:wrap;margin-bottom:30px">
        <button class="chip on" data-f="all">All</button>${groups.map((g) => `<button class="chip" data-f="${g.q.id}">${esc(g.m.no)}</button>`).join("")}
      </div>
      <div style="margin:-6px 0 34px">${modeSwitch("Echoes Within", "Turn Inward")}</div>
      <div id="refs">${groups.map((g) => g.items.map((it, i) => { const key = `asr:${g.q.id}:${i + 1}`; return `
        <article class="ref reveal" data-g="${g.q.id}">
          <div class="src">${esc(g.m.no)} · ${esc(g.m.title)}</div>
          <div class="prompt">${it.q}</div>
          <div class="body">${it.a.map((x) => `<p>${x}</p>`).join("")}</div>
          <div class="practice"><textarea data-k="${key}" placeholder="Sit with the question, then write what rises… (saved in this browser)">${esc(store.get(key) || "")}</textarea></div>
        </article>`; }).join("")).join("")}</div>`;
    $("#rchips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      $$("#rchips .chip").forEach((c) => c.classList.toggle("on", c === b));
      $$("#refs .ref").forEach((r) => { r.hidden = b.dataset.f !== "all" && r.dataset.g !== b.dataset.f; r.classList.add("in"); });
    });
    bindMode();
    observe();
  }

  function notFound() {
    main.innerHTML = `${pageHead("Not found", "Lost the Path?", "This page does not exist.")}<p class="center"><a class="btn" href="#/">Return home</a></p>`;
  }

  // ------------------------------------------------------------------ router
  let io;
  function observe() {
    io && io.disconnect();
    io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        $$("i[data-w]", en.target).forEach((i) => (i.style.width = i.dataset.w + "%"));
        io.unobserve(en.target);
      }
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    $$(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  async function route() {
    const [r = "", a, b] = location.hash.replace(/^#\/?/, "").split("/");
    ctl.abort(); ctl = new AbortController();
    document.body.classList.remove("menu-open", "practice");
    $("#menuBtn").setAttribute("aria-expanded", "false");
    const navKey = { verse: "verses", satsang: "satsangs", quiz: "quizzes" }[r] || r || "home";
    $$(".nav a").forEach((x) => x.classList.toggle("on", x.dataset.r === navKey));
    window.scrollTo(0, 0);
    const views = {
      "": home, shastra, verses: () => versesIndex(a), verse: () => versePage(+a, b), satsangs, satsang: () => satsangPage(a),
      quizzes: quizIndex, quiz: () => quizPage(a), reflections,
    };
    await (views[r] || notFound)();
    const titles = { "": "", verse: `Verse ${a}`, verses: "Verses", shastra: "The Shastra", satsangs: "Satsangs", satsang: "Satsang", quizzes: "Quizzes", quiz: "Quiz", reflections: "Reflections" };
    document.title = (titles[r] ? titles[r] + " · " : "") + "Shri Atmasiddhi Shastra · A Seeker's Journey";
    onScroll();
    observe();
    main.focus({ preventScroll: true });
  }

  function onScroll() {
    const home = !location.hash || location.hash === "#/" || location.hash === "#";
    $("#topbar").classList.toggle("solid", !home || scrollY > 40);
    $("#toTop").classList.toggle("show", scrollY > 900);
  }

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("hashchange", route);
  addEventListener("keydown", (e) => {
    if (/input|textarea/i.test(document.activeElement?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    const m = location.hash.match(/^#\/verse\/(\d+)/);
    if (!m) return;
    const n = +m[1];
    if (e.key === "ArrowRight" && n < 142) location.hash = `#/verse/${n + 1}`;
    if (e.key === "ArrowLeft" && n > 1) location.hash = `#/verse/${n - 1}`;
  });
  $("#menuBtn").addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    $("#menuBtn").setAttribute("aria-expanded", open);
  });
  $("#toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ------------------------------------------------------------------ AHO GURUDEV (music persists across pages)
  (() => {
    const au = $("#audio"), pl = $("#player"), btn = $("#plBtn"), ring = $(".pl-ring circle", pl);
    if (!au || !pl) return;
    const C = 2 * Math.PI * 22;
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C;
    let fade;
    const ramp = (to, done) => {
      clearInterval(fade);
      fade = setInterval(() => {
        const v = au.volume + (to > au.volume ? 0.04 : -0.06);
        if ((to > au.volume && v >= to) || (to <= au.volume && v <= to)) { au.volume = Math.max(0, Math.min(1, to)); clearInterval(fade); done && done(); }
        else au.volume = Math.max(0, Math.min(1, v));
      }, 60);
    };
    const set = (on) => {
      pl.classList.toggle("on", on);
      btn.setAttribute("aria-label", on ? "Pause Aho Gurudev" : "Play Aho Gurudev — instrumental");
      btn.setAttribute("aria-pressed", on);
    };
    btn.addEventListener("click", () => {
      if (au.paused) {
        au.volume = 0;
        au.play().then(() => { set(true); ramp(0.7); }).catch(() => set(false));
      } else {
        set(false);
        ramp(0, () => au.pause());
      }
    });
    au.addEventListener("timeupdate", () => {
      if (au.duration) ring.style.strokeDashoffset = C * (1 - au.currentTime / au.duration);
    });
    au.addEventListener("pause", () => set(false));
    au.addEventListener("play", () => set(true));
    setTimeout(() => pl.classList.add("ready"), 1200);
  })();

  fetch("data/site.json").then((r) => r.json()).then((d) => { SITE = d; route(); })
    .catch(() => { main.innerHTML = `<p class="empty" style="padding-top:160px">Could not load the site data. If you opened index.html directly, serve the folder over HTTP (e.g. <code>python3 -m http.server</code>).</p>`; });
})();
