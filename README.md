# MyBible CLI Toolkit (`mybible`)

A fast, offline-first CLI tool and isomorphic TypeScript/Node.js library for working with **MyBible** SQLite modules (`.SQLite3`, `.bbl.mybible`, `.cmt.mybible`, `.dct.mybible`), featuring an automatic **Psalms Versification Engine** that bridges Eastern (**LXX** — Septuagint / UBT / RST / NPU / BTI) and Western (**MT** — Masoretic / KJV / ESV / CUV / UBIO) traditions.

> 🤖 **For AI Agents & LLM Pipelines:** See [AGENTS.md](AGENTS.md) for the full operational contract, agent CLI patterns, complete 100-module registry, Psalms versification matrix, and HTTP REST API specification.

---

## Key Features

- **Instant Cold Start (< 50 ms):** Powered by Node.js 22+ built-in synchronous `node:sqlite` with zero native C++ build dependencies (`node-gyp`).
- **Isomorphic Core (`mybible-cli/core`) + HTTP REST API (`mybible serve`):** Zero `node:fs` or `node:sqlite` dependencies in the core engine — ready for browser (`sql.js` / `wa-sqlite`), Edge Workers, and web frontends.
- **100 Pre-Configured Modules (`78` Bible translations, `14` commentaries, `8` dictionaries):** One-command bootstrap on any machine via `mybible setup` or `mybible download --all`.
- **Smart Reference Parser (EN / UK / RU):** Parses references in any notation (`Ps 23:1-6`, `Пс 9:10-15`, `Псалом 22`, `Rom 8:28`, `Рим 8:28`, `Jn 3:16`, `1Cor 13:4-8`).
- **Psalms Versification Engine (LXX ↔ MT):**
  - Automatically detects each module's Psalm numbering tradition directly from Psalm 9 in the SQLite database.
  - Seamlessly aligns verses when reading or comparing across traditions (e.g. `LXX Пс 9:22-25` ↔ `MT Ps 10:1-4`; `LXX Пс 22:1-6` ↔ `MT Ps 23:1-6`; plus splits for `Ps 113`, `114–115`, `146–147`).
- **Book Coverage Diagnostics (`missingBookHint`):** When a requested book is absent from a partial module (e.g. Old Testament in `nup` or Genesis in `npu`), the CLI reports the exact book coverage of that module.
- **4 Output Formats:** `pretty`, `md`, `raw`, `json`.

---

## Quick Setup (on Any Machine)

```bash
# 1. Clone the repository
git clone https://github.com/ivan-yermolenko/my-bible-cli.git
cd my-bible-cli

# 2. Install dependencies and build
npm install
npm run build

# 3. Download the starter bundle (or --all for all 100 modules)
node --no-warnings bin/mybible.js setup
# or download the entire catalog:
node --no-warnings bin/mybible.js download --all

# 4. Link the `mybible` command globally
npm link
```

Convenient `package.json` scripts are also available:
```bash
npm run setup          # Build and download the default starter bundle
npm run setup:all      # Build and download all modules in the catalog
```

---

## Module Catalog (`mybible modules --remote`)

See [AGENTS.md](AGENTS.md#3-повний-реєстр-локально-встановлених-модулів-modules--100-модулів) for the full table of all **100 modules**.

### Bible Translations (78 modules)
- **Ukrainian (16):** `ubt` (`tub`, Turkoniak UBT, LXX), `utt` (UTT 2011, LXX), `ubio` (Ohienko 1962, MT), `ubio88` (Ohienko 1988, LXX), `cuv` (`cuv23`, `sup` — Contemporary Ukrainian Translation UBT 2023, MT), `npu` (New Ukrainian Translation 2022, Biblica: NT + Psalms, LXX), `umt` (UMT 2007, MT), `hom` (Khomenko 1963, MT), `ukrk` (Kulish/Puliui 1905, MT), `uk1903` (Kulish/Levytskyi 1903, MT), `fil` (Filaret 2004, LXX), `gyz` (Hyzha 2006, LXX), `ukder` (Derkach 1992, MT), `nup` (Popchenko 2021, NT, MT), `lcvu` (Zhuromskyi literal w/ Strong's, LXX), `igrb` (Greek-Ukrainian Interlinear, LXX).
- **Russian & Church Slavonic (11):** `rst`, `rst-strong`, `bti` (`kulakov`, Kulakov Zaoksky Translation 2015, LXX), `nrt`, `ibs`, `rbo`, `jnt` (Stern's Jewish NT), `desn` (Desnitsky), `tnhr` (Yosifon TaNaKh), `kassian` (NT), `ucs`.
- **English (39):** `esv`, `kjv`, `nkjv`, `nasb`, `niv`, `lsb`, `net`, `csb17` (`csb`), `nlt`, `bsb`, `amp`, `ylt`, `gnv`, `lxxe` (Brenton's Septuagint), `rsv`, `asv`, `web`, `msg`, `ceb`, `isv`, `mev`, `cjb`, `tlv`, `ts2009`, `drb`, `nrsvce`, `njb1985`, `spe`, `lbp`, `lsv`, `rsv2ce`, `nabre`, `cevd`, `auv`, `gntd`, `erv`, `gnt`, `nlv`, `wpnt`.
- **Original Languages & Latin (12):**
  - Greek: `lxx`, `na28`, `sblgnt`, `tr`, `tisch`, `ntgt`.
  - Hebrew: `wlc`, `wlca` (with vowels, accents & Strong's), `wlcc`, `hac` (Aleppo Codex), `dhnt` (Delitzsch's Hebrew NT).
  - Latin: `vulg` (Biblia Sacra Vulgata).

### Commentaries (14 modules) & Dictionaries (8 modules)
- **Commentaries:** `ngsb` (New Geneva Study Bible), `calvin` (John Calvin, NT), `henry` (Matthew Henry), `dauma` (Jochem Douma, OT), `mcarthur` (John MacArthur), `macdonald` (William MacDonald), `spurgeon` / `spurgeon-en` (*The Treasury of David*, Psalms), `lopukhin` (Lopukhin), `barclay` (William Barclay), `nrt-notes`, `hertz` (J. H. Hertz, Torah), `tsk` (Treasury of Scripture Knowledge), `sample`.
- **Dictionaries:** `strong` (14,298 H/G entries), `ngsb-dict`, `elwell`, `nbd`, `brockhaus`, `nikifor`, `men`, `sample`.

---

## CLI Usage Examples

### 1. Reading Passages (`mybible get`)

```bash
# Pretty terminal output
mybible get "Ps 23:1-6" --trans esv
mybible get "Пс 22:1-6" --trans npu

# Markdown export for study notes
mybible get "Пс 9:10-11" --trans cuv --format md

# Automatic LXX <-> MT mapping with detailed versification info (--info)
mybible get "Пс 9:22-25" --trans kjv --info

# Structured JSON for pipelines and AI agents
mybible get "Rom 8:28" --trans esv --format json
```

### 2. Comparing Translations (`mybible compare`)

```bash
# Compare Eastern (LXX: ubt, bti, npu) and Western (MT: cuv, ubio, kjv, esv) translations
# The engine automatically aligns LXX Ps 22 with MT Ps 23!
mybible compare "Ps 23:1-4" --trans ubt,cuv,bti,npu,kjv,esv

# Verse-by-verse comparison in Markdown
mybible compare "Ps 10:1-4" --trans ubt,rst,ubio,kjv --verse-by-verse --format md

# Disable automatic Psalm mapping (query literal chapter/verse numbers as stored)
mybible compare "Ps 23:1-3" --trans ubt,kjv --raw-numbers
```

### 3. Search, Books, Commentaries, Dictionaries & REST API

```bash
# Full-text search
mybible search "grace" --trans esv --testament nt --limit 10

# List books in a module
mybible books --trans npu

# Commentaries and dictionaries
mybible comment "Rom 8:28" --mod calvin --format md
mybible dict "G25" --mod strong --format md

# Local HTTP REST API server for web frontends
mybible serve --port 3333
```

---

## Using as a TypeScript / Node.js Library

```typescript
import {
  MyBibleService,
  formatPassageResult,
} from 'mybible-cli';

const service = new MyBibleService();

// Fetch a passage with automatic LXX <-> MT versification mapping
const result = service.getPassage('Пс 22:1-6', { trans: 'esv', info: true });
console.log(formatPassageResult(result, { format: 'md' }));

// Compare multiple translations across traditions
const comparison = service.comparePassage('Ps 10:1-4', {
  translations: ['ubt', 'cuv', 'bti', 'kjv', 'esv'],
});
```
