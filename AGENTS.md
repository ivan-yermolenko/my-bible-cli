# AGENTS.md — Operational Contract & Technical Reference for AI Agents and Developers

> **Purpose:** This document serves as the authoritative technical and operational contract for autonomous AI agents (LLM subagents, AutoGPT, LangChain/LlamaIndex pipelines), developers, and automation scripts interacting with the **MyBible CLI Toolkit (`mybible`)** repository.

---

## Table of Contents

1. [Overview (`MyBible CLI Toolkit`)](#1-overview-mybible-cli-toolkit)
2. [CLI Cheat Sheet for AI Agents (Recommended Patterns)](#2-cli-cheat-sheet-for-ai-agents-recommended-patterns)
3. [Full Registry of Pre-Installed Modules (`modules/`)](#3-full-registry-of-pre-installed-modules-modules--100-modules)
4. [Psalms Versification Contract (LXX vs MT)](#4-psalms-versification-contract-lxx-vs-mt)
5. [Codebase Architecture & Extension Map](#5-codebase-architecture--extension-map)
6. [Built-in HTTP REST API Specification](#6-built-in-http-rest-api-specification)
7. [Programmatic Usage (TypeScript / Node.js)](#7-programmatic-usage-typescript--nodejs)

---

## 1. Overview (`MyBible CLI Toolkit`)

`mybible-cli` is an ultra-fast, fully offline engine and CLI toolkit for querying **MyBible SQLite** modules (`.bbl.mybible`, `.cmt.mybible`, `.dct.mybible`, `.SQLite3`).

### Key Advantages for AI Agents:
- **Instant Cold Start (< 50 ms):** Uses Node.js 22.5+ built-in synchronous `node:sqlite`, requiring no heavy runtime initialization, external daemons, or native C++ compilation (`node-gyp`).
- **Automatic Psalms Versification Alignment (LXX ↔ MT):** Solves the classic biblical reference mismatch between Eastern Septuagint numbering (LXX: UBT, RST, Filaret, NPU, BTI) and Western Masoretic numbering (MT: KJV, ESV, CUV, UBIO).
- **100% Isomorphic Core:** The core engine (`src/core/`) has zero Node.js OS/FS/SQLite dependencies, relying purely on `SqlStorageDriver`. It can run directly in browsers (`sql.js`, `wa-sqlite`), Cloudflare Workers, Edge Runtimes, Bun, or Deno.
- **Two Execution Modes:**
  1. **CLI / Bash:** Global `mybible` command (or `node --no-warnings bin/mybible.js`).
  2. **TypeScript / ESM Library:** Import from `mybible-cli` (Node.js with `ModuleRegistry`) or `mybible-cli/core` (pure isomorphic engine).

---

## 2. CLI Cheat Sheet for AI Agents (Recommended Patterns)

When invoking `mybible` from a terminal or agent tool, choose `--format` based on downstream consumption:
- `--format md` — **Recommended for study notes, sermon outlines, devotions, and user-facing responses.** Produces valid GitHub Flavored Markdown with blockquotes (`> **1** ...`) and metadata.
- `--format json` — **Recommended for programmatic parsing.** Returns typed JSON with verse arrays, book numbers, and versification mapping coordinates.
- `--format raw` — **Recommended for bash pipelines** (`grep`, `awk`, `sed`, clipboard). Plain text only without formatting or tags.
- `--format pretty` — Colored terminal output for interactive human reading.

### 2.1. Fetching a Passage: `mybible get`
```bash
# Markdown output from the default translation (UBT)
mybible get "Rom 8:28-30" --format md

# Querying a specific translation (e.g., ESV or Ukrainian NPU / CUV)
mybible get "Jn 1:1-5" --trans esv --format md
mybible get "Мт 5:1-12" --trans npu --format json

# Psalm with detailed versification mapping note (--info)
mybible get "Пс 22:1-6" --trans esv --info --format md

# Preserve Strong's numbers or translator footnotes
mybible get "Gen 1:1" --trans kjv --strongs --format raw
mybible get "Mt 6:9-13" --trans ubt --notes --format md

# Disable automatic LXX <-> MT mapping (query literal chapter/verse numbers as stored)
mybible get "Пс 22:1-6" --trans esv --raw-numbers --format md
```

### 2.2. Comparing Translations: `mybible compare`
```bash
# Compare default translations (ubt, ubio, npu, rst, kjv, esv)
mybible compare "Jn 14:6" --format md

# Compare specific modules with verse-by-verse alignment (--verse-by-verse)
mybible compare "Rom 8:28" --trans ubt,cuv,npu,esv --verse-by-verse --format md

# Cross-tradition Psalm comparison (LXX Ps 22 automatically maps to MT Ps 23)
mybible compare "Пс 22:1-3" --trans ubt,cuv,bti,kjv --format md

# Acrostic Psalm 9 split (LXX 9:22-25 automatically maps to MT Ps 10:1-4)
mybible compare "Пс 9:22-25" --trans ubt,rst,kjv,esv --verse-by-verse --format md
```

### 2.3. Full-Text Search: `mybible search`
```bash
# Search across the entire Bible
mybible search "grace" --trans esv --limit 10 --format md

# Filter by Testament: New Testament only (--testament nt) or Old Testament only (--testament ot)
mybible search "виправдання" --trans npu --testament nt --limit 20 --format json
```

### 2.4. Listing Books & Modules
```bash
# List all books and chapter counts in a translation
mybible books --trans ubt --format md

# List locally installed modules
mybible modules

# JSON module list for AI agents
mybible modules --format json

# List all downloadable modules in the remote catalog
mybible modules --remote
```

### 2.5. Downloading & Setup: `download` and `setup`
```bash
# Quick starter bundle (core translations + NGSB, Calvin, Spurgeon, Strong's)
mybible setup

# Download and compile ALL modules from the catalog
mybible download --all

# Download by category (commentaries only, dictionaries only, or bibles only)
mybible download --commentaries
mybible download --dictionaries
mybible download --bibles

# Download specific modules by ID
mybible download ngsb calvin henry mcarthur spurgeon strong elwell

# Download from the official MyBible Extra Registry
mybible download --extra-registry
```

### 2.6. Commentaries & Dictionaries: `comment` and `dict`
```bash
# Query biblical commentaries (defaults to NGSB or first available commentary)
mybible comment "Rom 8:28" --format md
mybible comment "Rom 8:28-30" --mod calvin --format md
mybible comment "Rom 8:28" --mod mcarthur --format md
mybible comment "Ps 23:1-6" --mod spurgeon --format md
mybible comment "Gen 1:1" --mod henry --format md

# Look up a theological term or Strong's number in a dictionary
mybible dict "G25" --format md
mybible dict "H430" --mod strong --format md
mybible dict "Благодать" --mod elwell --format md
mybible dict "Завет" --mod ngsb-dict --format md
mybible dict "Оправдание" --mod nbd --format md
```

### 2.7. Local HTTP REST API Server: `mybible serve`
```bash
# Start the API server on port 3333
mybible serve --port 3333 --host 127.0.0.1
```

---

## 3. Full Registry of Pre-Installed Modules (`modules/` — 100 Modules)

The repository includes and supports **100 pre-configured modules** (**78 Bible translations**, **14 commentaries**, and **8 dictionaries/lexicons**):

### 3.1. Bible Translations (`.bbl.mybible` — 78 Modules)

| Module ID | File in `modules/` | Lang | Coverage | Psalms Tradition | Description |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`ubt`** (alias `tub`) | `UBT.bbl.mybible` | `uk` | 66 books | **LXX** | Ukrainian Bible by R. Turkoniak (UBT). Default translation. |
| **`utt`** | `UTT.bbl.mybible` | `uk` | 65 books | **LXX** | Ukrainian Bible: R. Turkoniak 2011 (UTT). |
| **`ubio`** | `UBIO.bbl.mybible` | `uk` | 66 books | **MT** | Bible in translation of Ivan Ohienko (1962). |
| **`ubio88`** | `UBIO88.bbl.mybible` | `uk` | 66 books | **LXX** | Bible in translation of I. Ohienko (1988 edition, native SQLite3). |
| **`cuv`** (aliases `cuv23`, `sup`) | `CUV.bbl.mybible` | `uk` | 66 books | **MT** | **Contemporary Ukrainian Translation UBT (CUV'23)** (2020–2023). |
| **`npu`** | `NPU.bbl.mybible` | `uk` | **28 books (NT + Psalms)** | **LXX** | New Ukrainian Translation (NPU 2022, Biblica — NT & Psalms). |
| **`umt`** | `UMT.bbl.mybible` | `uk` | 66 books | **MT** | Holy Bible: Contemporary Language (UMT 2007). |
| **`hom`** | `HOM.bbl.mybible` | `uk` | 66 books | **MT** | Holy Scripture by Ivan Khomenko (1963, Rome edition). |
| **`ukrk`** | `UKRK.bbl.mybible` | `uk` | 66 books | **MT** | Bible by P. Kulish & I. Puliui (1905). |
| **`uk1903`** | `UK1903.bbl.mybible` | `uk` | 66 books | **MT** | Bible by P. Kulish & I. Levytskyi (Vienna 1903). |
| **`fil`** | `FIL.bbl.mybible` | `uk` | 66 books | **LXX** | Bible by Patriarch Filaret (2004). |
| **`gyz`** | `GYZ.bbl.mybible` | `uk` | 66 books | **LXX** | Bible, Modern Translation by Oleksandr Hyzha (2006). |
| **`ukder`** | `UKDER.bbl.mybible` | `uk` | 30 books | **MT** | Velyke Vidkryttia by Diana Derkach (1992). |
| **`nup`** | `NUP.bbl.mybible` | `uk` | **27 books (NT)** | **MT** | New Testament by Yurii Popchenko (2021, Textus Receptus). |
| **`lcvu`** | `LCVU.bbl.mybible` | `uk` | 66 books | **LXX** | Literal-Meaning Translation by V. Zhuromskyi (with Strong's). |
| **`igrb`** | `IGRB.bbl.mybible` | `grc/uk` | 66 books | **LXX** | Interlinear Greek-Ukrainian Bible by V. Zhuromskyi. |
| **`rst`** | `RST.bbl.mybible` | `ru` | 66 books | **LXX** | Russian Synodal Translation (RST). |
| **`rst-strong`** | `RST-STRONG.bbl.mybible` | `ru` | 66 books | **LXX** | Russian Synodal Translation with embedded Strong's numbers. |
| **`bti`** (alias `kulakov`) | `BTI.bbl.mybible` | `ru` | 66 books | **LXX** | **Contemporary Russian Translation ed. M. P. & M. M. Kulakov (BTI 2015)**. |
| **`nrt`** | `NRT.bbl.mybible` | `ru` | 66 books | **LXX** | New Russian Translation (NRT, Biblica). |
| **`ibs`** | `IBS.bbl.mybible` | `ru` | 66 books | **MT** | Slovo Zhizni (IBS / Biblica). |
| **`rbo`** | `RBO.bbl.mybible` | `ru` | 66 books | **MT** | Contemporary Russian Translation (RBO 2011/2015). |
| **`jnt`** | `JNT.bbl.mybible` | `ru` | **27 books (NT)** | **MT** | Complete Jewish New Testament by David Stern. |
| **`desn`** | `DESN.bbl.mybible` | `ru` | 15 books | **MT** | Biblical Translations by Andrey Desnitsky. |
| **`tnhr`** | `TNHR.bbl.mybible` | `ru` | **39 books (OT)** | **MT** | TaNaKh in Russian by David Yosifon (1975). |
| **`kassian`** | `KASSIAN.bbl.mybible` | `ru` | **27 books (NT)** | **MT** | New Testament by Bishop Kassian (Bezobrazov). |
| **`ucs`** | `UCS.bbl.mybible` | `cu` | 66 books | **MT** | Church Slavonic Bible (Elizabethan). |
| **`kjv`** | `KJV.bbl.mybible` | `en` | 66 books | **MT** | King James Version (1611). |
| **`nkjv`** | `NKJV.bbl.mybible` | `en` | 66 books | **MT** | New King James Version. |
| **`esv`** | `ESV.bbl.mybible` | `en` | 66 books | **MT** | English Standard Version (2001/2016). |
| **`nasb`** | `NASB.bbl.mybible` | `en` | 66 books | **MT** | New American Standard Bible. |
| **`niv`** | `NIV.bbl.mybible` | `en` | 66 books | **MT** | New International Version. |
| **`lsb`**, **`net`**, **`csb17`** (`csb`), **`nlt`**, **`bsb`**, **`amp`**, **`ylt`**, **`gnv`**, **`rsv`**, **`asv`**, **`web`**, **`msg`**, **`ceb`**, **`isv`**, **`mev`**, **`cjb`**, **`tlv`**, **`ts2009`**, **`drb`**, **`nrsvce`**, **`njb1985`**, **`lbp`**, **`lsv`**, **`rsv2ce`**, **`nabre`**, **`cevd`**, **`gntd`**, **`erv`**, **`gnt`**, **`nlv`** | `*.bbl.mybible` | `en` | 66 books | **MT** | Additional English translations from `bolls.life` (Legacy Standard, NET, CSB 2017, NLT, Berean, Amplified, Young's Literal, Geneva 1599, RSV, ASV w/ Strong's, WEB, The Message, CEB, ISV, MEV, Complete Jewish Bible, TLV, Douay-Rheims, etc.). |
| **`lxxe`** | `LXXE.bbl.mybible` | `en` | **39 books (OT)** | **LXX** | Brenton's English Septuagint (1851). |
| **`spe`** | `SPE.bbl.mybible` | `en` | **5 books (Torah)** | **MT** | Samaritan Pentateuch in English (2013). |
| **`auv`**, **`wpnt`** | `AUV.bbl.mybible`, `WPNT.bbl.mybible` | `en` | **27 books (NT)** | **MT** | An Understandable Version (1995) & Wilbur Pickering's New Testament. |
| **`lxx`** | `LXX.bbl.mybible` | `el` | 66 books | **MT** | Greek Bible (Septuagint LXX + Greek NT). |
| **`na28`**, **`sblgnt`**, **`tr`**, **`tisch`**, **`ntgt`** | `*.bbl.mybible` | `el` | **27 books (NT)** | **MT** | Greek New Testament: Nestle-Aland 28th Ed. (`na28`), SBLGNT (`sblgnt`), Textus Receptus 1624 (`tr`), Tischendorf 8th Ed. w/ Strong's (`tisch`) and without (`ntgt`). |
| **`wlc`** | `WLC.bbl.mybible` | `he` | 66 books | **MT** | Westminster Leningrad Codex (Hebrew OT + Hebrew NT). |
| **`wlca`**, **`wlcc`**, **`hac`** | `WLCA.bbl.mybible`, `WLCC.bbl.mybible`, `HAC.bbl.mybible` | `he` | **39 books (OT)** | **MT** | Hebrew OT: WLC with vowels, accents & Strong's (`wlca`), consonantal WLC (`wlcc`), Aleppo Codex (`hac`). |
| **`dhnt`** | `DHNT.bbl.mybible` | `he` | **27 books (NT)** | **MT** | Delitzsch's Hebrew New Testament (1877/1998). |
| **`vulg`** | `VULG.bbl.mybible` | `la` | 66 books | **LXX** | Biblia Sacra juxta Vulgatam Clementinam (Latin Vulgate). |

### 3.2. Commentaries (`.cmt.mybible` — 14 Modules)

| Module ID | File in `modules/` | Lang | Coverage | Description & Tradition |
| :--- | :--- | :---: | :---: | :--- |
| **`ngsb`** | `NGSB.cmt.mybible` | `ru` | Whole Bible | **New Geneva Study Bible** (ed. R. C. Sproul). Classic Reformed study notes (default commentary). |
| **`calvin`** | `CALVIN.cmt.mybible` | `ru` | New Testament | **John Calvin:** Commentaries on the New Testament. Classic Reformed exegesis. |
| **`henry`** | `HENRY.cmt.mybible` | `ru` | Whole Bible | **Matthew Henry:** Complete Commentary on the Whole Bible (6 vols, Puritan classic). |
| **`dauma`** | `DAUMA.cmt.mybible` | `ru` | Old Testament | **Jochem Douma:** Old Testament Survey & Reformed Exegesis. |
| **`mcarthur`** | `MCARTHUR.cmt.mybible` | `ru` | Whole Bible | **John MacArthur:** MacArthur Study Bible / NT Commentaries. |
| **`macdonald`** | `MACDONALD.cmt.mybible` | `ru` | Whole Bible | **William MacDonald:** Believer's Bible Commentary. |
| **`spurgeon`** | `SPURGEON.cmt.mybible` | `ru` | Psalms | **Charles Spurgeon:** *The Treasury of David* (Russian translation). |
| **`spurgeon-en`** | `SPURGEON-EN.cmt.mybible` | `en` | Psalms (150) | **Charles Spurgeon:** *The Treasury of David* (complete 7-volume English edition on all 150 Psalms). |
| **`lopukhin`** | `LOPUKHIN.cmt.mybible` | `ru` | Whole Bible | **A. P. Lopukhin Explanatory Bible** (11-volume historical & textual commentary). |
| **`barclay`** | `BARCLAY.cmt.mybible` | `ru` | New Testament | **William Barclay:** Daily Study Bible (historical-cultural & lexical notes). |
| **`nrt-notes`** | `NRT-NOTES.cmt.mybible` | `ru` | Whole Bible | **New Russian Translation (NRT / Biblica) Study Notes**. |
| **`hertz`** | `HERTZ.cmt.mybible` | `ru` | Torah (5 books) | **J. H. Hertz:** Commentary on the Pentateuch. |
| **`tsk`** | `TSK.cmt.mybible` | `en` | Whole Bible | **Treasury of Scripture Knowledge (TSK):** Cross-reference & parallel passage database. |
| **`sample`** | `sample.cmt.mybible` | `uk` | Demo | Sample Ukrainian theological commentary for key passages. |

### 3.3. Dictionaries & Lexicons (`.dct.mybible` — 8 Modules)

| Module ID | File in `modules/` | Lang | Entries | Description |
| :--- | :--- | :---: | :---: | :--- |
| **`strong`** | `STRONG.dct.mybible` | `el/he/en` | 14,298 | **Complete Hebrew & Greek Strong's Lexicon** (`H1..H8674`, `G1..G5624`, lookup by code or lemma). |
| **`ngsb-dict`** | `NGSB-DICT.dct.mybible` | `ru` | ~150 | **New Geneva Study Bible Theological Articles & Dictionary**. |
| **`elwell`** | `ELWELL.dct.mybible` | `ru` | ~6,100 | **Evangelical Dictionary of Theology** (Walter Elwell / Baker). |
| **`nbd`** | `NBD.dct.mybible` | `ru` | ~2,100 | **New Bible Dictionary** (IVP — Martin, Marshall, Millard, Packer, Wiseman). |
| **`brockhaus`** | `BROCKHAUS.dct.mybible` | `ru` | ~6,400 | **Brockhaus Bible Encyclopedia** (Fritz Rienecker, Gerhard Maier). |
| **`nikifor`** | `NIKIFOR.dct.mybible` | `ru` | ~7,500 | **Illustrated Bible Encyclopedia** by Archimandrite Nikifor. |
| **`men`** | `MEN.dct.mybible` | `ru` | ~2,900 | **Bibliological Dictionary** by Fr. Alexander Men. |
| **`sample`** | `sample.dct.mybible` | `uk` | Demo | Sample Ukrainian theological dictionary. |

> [!IMPORTANT]
> **Book Coverage Note:** Partial modules (such as **`nup`**, **`kassian`**, **`jnt`**, **`na28`**, **`sblgnt`**, **`tr`** with 27 NT books, **`npu`** with 28 books [Psalms + NT], or **`tnhr`**, **`lxxe`**, **`wlca`**, **`hac`** with 39 OT books) will automatically trigger a precise `missingBookHint` in the CLI when querying a book they do not contain.

### Module Discovery Priority (`ModuleRegistry`)
The registry searches for database files in the following order:
1. Custom directories passed to the constructor or via the `MYBIBLE_DIR` environment variable (colon-separated `:`).
2. `./modules` in the current working directory (`process.cwd()`).
3. `modules/` inside the installed package directory (`import.meta.url`).
4. Global user directories: `~/.local/share/mybible/modules` and `~/.config/mybible/modules`.

---

## 4. Psalms Versification Contract (LXX vs MT)

### 4.1. Why Does the Difference Exist?
The Hebrew Masoretic Text (**MT**) and the Greek Septuagint (**LXX**) divide the 150 Psalms differently by combining or splitting specific psalms:
- The Septuagint (and Eastern translations: UBT, RST, Filaret, NPU, BTI) merges Masoretic Psalms 9 and 10 into a single acrostic Psalm 9.
- Consequently, most Psalm numbers in the Septuagint trail by 1: **MT = LXX + 1** (e.g., *"The LORD is my Shepherd"* is **Psalm 22** in LXX and **Psalm 23** in MT).
- Near the end of the Psalter, Psalms 113–116 and 146–147 split and merge again, realigning at Psalms 148–150.

### 4.2. Automatic Tradition Detection Heuristics
1. **Query Tradition Hint (`inputTraditionHint`):**
   - Cyrillic book names (`Пс`, `Псалом`, `Псалтир`) default to **`LXX`**.
   - Latin book names (`Ps`, `Psalm`, `Psalms`) default to **`MT`**.
2. **Module Tradition Inspection (`ModuleMetadata.tradition`):**
   - The engine runs an automatic SQL inspection on the module:
     ```sql
     SELECT COUNT(*) as cnt FROM verses WHERE book_number = 190 AND chapter = 9;
     ```
   - If Chapter 9 has $\ge 25$ verses (typically 39) → **`LXX`** (Psalms 9 & 10 merged).
   - If Chapter 9 has $< 25$ verses (typically 21) → **`MT`**.
3. **Automatic Cross-Translation:**
   - When querying `mybible get "Пс 22:1-6" --trans esv` (LXX query against an MT module), the engine automatically translates it to `Ps 23:1-6`, fetches the matching verses, and records `mappedFrom` in the metadata.

### 4.3. Complete Versification Mapping Matrix

| LXX (Septuagint / UBT / RST / NPU / BTI) | MT (Masoretic / KJV / ESV / CUV / UBIO) | Offset & Notes |
| :--- | :--- | :--- |
| **Ps 1–8** | **Ps 1–8** | **Identical (1:1)** |
| **Ps 9:1–21** | **Ps 9:1–21** | First half of the acrostic matches verse-for-verse |
| **Ps 9:22–39** | **Ps 10:1–18** | Second half forms MT Ps 10: **`MT_verse = LXX_verse - 21`** |
| **Ps 10–112** | **Ps 11–113** | **Chapter shift +1 in MT (`MT = LXX + 1`)**. Verses match 1:1. |
| **Ps 113:1–8** | **Ps 114:1–8** | First part of LXX Ps 113 = MT Ps 114 |
| **Ps 113:9–26** | **Ps 115:1–18** | Second part of LXX Ps 113 = MT Ps 115: **`MT_verse = LXX_verse - 8`** |
| **Ps 114:1–9** | **Ps 116:1–9** | LXX Ps 114 = first part of MT Ps 116 |
| **Ps 115:1–10** | **Ps 116:10–19** | LXX Ps 115 = second part of MT Ps 116: **`MT_verse = LXX_verse + 9`** |
| **Ps 116–145** | **Ps 117–146** | **Chapter shift +1 in MT (`MT = LXX + 1`)**. Verses match 1:1. |
| **Ps 146:1–11** | **Ps 147:1–11** | LXX Ps 146 = first part of MT Ps 147 |
| **Ps 147:1–9** | **Ps 147:12–20** | LXX Ps 147 = second part of MT Ps 147: **`MT_verse = LXX_verse + 11`** |
| **Ps 148–150** | **Ps 148–150** | **Identical (1:1)** |
| *(Ps 151)* | *(non-canonical)* | Additional Septuagint psalm (present only in select LXX modules) |

### 4.4. Automatic Segment Splitting
If a requested range crosses a Psalm split boundary, the engine **automatically splits it into multiple sub-queries**:
- Query: `mybible get "Пс 9:15-25" --trans kjv`
- Translation:
  1. `LXX Ps 9:15–21` $\rightarrow$ `MT Ps 9:15–21`
  2. `LXX Ps 9:22–25` $\rightarrow$ `MT Ps 10:1–4`
- The user receives one seamless, contiguous passage with zero missing verses.

---

## 5. Codebase Architecture & Extension Map

```
MyBibleCli/
├── bin/
│   └── mybible.js            # Executable CLI entrypoint for Node.js
├── src/
│   ├── index.ts              # Node.js entrypoint (exports MyBibleService, driver, registry)
│   ├── cli.ts                # Commander.js CLI definitions
│   ├── types.ts              # Shared TypeScript interfaces and types
│   │
│   ├── core/                 # ISOMORPHIC CORE (Zero Node.js OS/FS dependencies)
│   │   ├── engine.ts         # IsomorphicBibleModule, MyBibleCoreEngine
│   │   └── index.ts          # Browser/Edge-safe exports
│   │
│   ├── db/                   # SQLite storage layer
│   │   └── sqlite-adapter.ts # NodeSqliteStorageDriver (node:sqlite) & MyBibleDatabase
│   │
│   ├── config/               # Module discovery & multi-source compilers
│   │   ├── registry.ts       # ModuleRegistry: discovery, type detection, alias resolution
│   │   └── downloader.ts     # Compilers for Beblia XML, Bolls JSON, eBible VPL, BibleQuote, Strong's, Spurgeon, TSK, Extra Registry, pure-JS ZIP
│   │
│   ├── parser/               # Scripture reference parsing
│   │   ├── book-names.ts     # 66 canonical books, UA/RU/EN aliases, MyBible numbers (10..730)
│   │   └── reference-parser.ts # Reference parser ("Пс 9:10-15", "Jn 3:16", "1Cor 13")
│   │
│   ├── versification/        # Canonical mapping engine
│   │   └── psalms-mapper.ts  # LXX <-> MT calculations, verse offsets, segment splitting
│   │
│   ├── formatters/           # Output formatters
│   │   └── output.ts         # pretty, Markdown, raw text, JSON formatters
│   │
│   ├── utils/                # Helpers
│   │   └── text-cleaner.ts   # Cleans Strong's (<S>), notes (<n>), italics (<i>), Words of Christ (<J>)
│   │
│   └── server/               # Built-in microservice
│       └── api-server.ts     # REST HTTP server via native node:http (CORS enabled)
│
├── modules/                  # Local SQLite databases (.bbl/.cmt/.dct.mybible)
├── tests/                    # Unit & integration tests (node:test)
│   ├── cli-and-service.test.ts
│   ├── downloader.test.ts
│   ├── psalms-mapper.test.ts
│   ├── reference-parser.test.ts
│   ├── sqlite-adapter.test.ts
│   └── text-cleaner.test.ts
└── package.json
```

### Build & Test Commands
```bash
# Compile TypeScript to dist/
npm run build

# Run the test suite (all 46 tests must pass)
npm test

# Run in dev mode without pre-compilation (tsx)
npm run dev -- get "Пс 22:1-6"
```

---

## 6. Built-in HTTP REST API Specification

Start the server with `mybible serve --port 3333` for instant HTTP access with CORS (`*`) enabled.

### Endpoints

| Method | Endpoint | Description | Example Query Params |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/health` | Server health check | — |
| `GET` | `/api/modules` | List installed modules | `?type=bible` (or `commentary`, `dictionary`) |
| `GET` | `/api/books` | List books in a module | `?trans=ubt` |
| `GET` | `/api/chapters` | List chapters and verse counts for a book | `?book=Пс&trans=ubt` |
| `GET` | `/api/passage` | Fetch a passage with LXX/MT mapping | `?q=Пс+22:1-6&trans=esv&format=md&info=true` |
| `GET` | `/api/compare` | Compare multiple translations | `?q=Пс+9:22-25&trans=ubt,cuv,kjv&format=json&verseByVerse=true` |
| `GET` | `/api/search` | Full-text search | `?q=grace&trans=esv&limit=20&testament=all` |
| `GET` | `/api/commentaries` | Fetch commentary for a passage | `?q=Rom+8:28&mod=calvin&format=md` |
| `GET` | `/api/dictionary` | Look up a dictionary entry | `?q=G25&mod=strong&format=json` |

### `curl` Examples

```bash
# 1. Fetch a passage in Markdown
curl "http://127.0.0.1:3333/api/passage?q=Ps+23:1-6&trans=esv&format=md"

# 2. Compare translations in JSON
curl "http://127.0.0.1:3333/api/compare?q=Jn+14:6&trans=ubt,cuv,npu,esv"

# 3. Search in the New Testament
curl "http://127.0.0.1:3333/api/search?q=grace&trans=esv&testament=nt&limit=5"

# 4. Look up a Strong's lexicon entry
curl "http://127.0.0.1:3333/api/dictionary?q=G25&mod=strong"
```

---

## 7. Programmatic Usage (TypeScript / Node.js)

```typescript
import {
  MyBibleService,
  formatPassageResult,
  formatComparisonResults,
} from 'mybible-cli';

// 1. Initialize service
const service = new MyBibleService();

// 2. Fetch passage with automatic LXX ↔ MT mapping
const passageResult = service.getPassage('Пс 22:1-6', {
  trans: 'esv',
  info: true,
  format: 'md',
});
console.log(formatPassageResult(passageResult, { format: 'md', info: true }));

// 3. Compare translations
const comparison = service.comparePassage('Пс 9:22-25', {
  translations: ['ubt', 'cuv', 'bti', 'npu', 'kjv', 'esv'],
  format: 'md',
});
console.log(formatComparisonResults(comparison, { format: 'md', verseByVerse: true }));

// 4. Full-text search
const searchResult = service.search('grace', {
  trans: 'esv',
  limit: 10,
  testament: 'nt',
});
```
