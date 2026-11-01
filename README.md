# MyBible CLI Toolkit (`mybible`)

Швидкий, автономний CLI-застосунок та TypeScript/Node.js бібліотека для локальної роботи з модулями формату **MyBible** (`.SQLite3`, `.bbl.mybible`, `.cmt.mybible`, `.dct.mybible`) з вбудованим движком канонічного мапінгу Псалмів між східною (**LXX** — Септуаґінта / УБТ / РСТ) та західною (**MT** — Масоретська / KJV / ESV / НПУ / UBIO) традиціями.

> 🤖 **Для AI-агентів та LLM-пайплайнів:** Повний операційний контракт, шпаргалку викликів, повний реєстр модулів, математичну матрицю зсувів Псалмів та опис HTTP REST API дивіться у [AGENTS.md](AGENTS.md).

---

## Ключові можливості

- **Миттєвий доступ (< 50 мс холодний старт):** Працює на вбудованому синхронному рушії `node:sqlite` (Node.js 22+) без жодних C++ залежностей (`node-gyp`).
- **Вбудований каталог на 19 перекладів Біблії (One-Command Setup):** Розгортання з нуля на будь-якій машині однією командою `mybible setup` або `mybible download --all`.
- **Розумний парсер посилань (UA / RU / EN):** Розпізнає посилання у будь-якому форматі (`Пс 9:10-15`, `Псалом 22`, `Psalms 23:1-6`, `Рим 8:28`, `Ин 3:16`, `Ів 3:16`, `1Кор 13:4-8`).
- **Psalms Versification Engine (LXX ↔ MT):**
  - Автоматично визначає традицію нумерації кожного модуля (за структурою Псалма 9 у самій базі даних SQLite).
  - Безшовно синхронізує вірші під час читання та порівняння перекладів (наприклад, `Пс 9:22-25` у LXX $\leftrightarrow$ `Ps 10:1-4` у MT; `Пс 22:1-6` у LXX $\leftrightarrow$ `Ps 23:1-6` у MT; розбиття `Пс 113`, `114–115`, `146–147`).
- **4 формати експорту:**
  - `pretty` — кольоровий термінальний вивід із бейджами традицій та підказками мапінгу.
  - `md` — готовий Markdown із цитатами (`> **10** ...`) та GitHub-callout блоками `> [!NOTE]` для конспектів та AI-агентів.
  - `raw` — чистий текст для консольних пайплайнів (`grep`, `awk`, `pbcopy`).
  - `json` — структурований JSON з метаданими модулів та координатами мапінгу.

---

## Швидке розгортання з нуля (на будь-якій машині)

```bash
# 1. Клонування репозиторію
git clone https://github.com/ivan-yermolenko/my-bible-cli.git
cd my-bible-cli

# 2. Встановлення залежностей та збірка
npm install
npm run build

# 3. Завантаження стартового набору перекладів (або --all для всіх 19 модулів)
node --no-warnings bin/mybible.js setup
# або всі 19 перекладів:
node --no-warnings bin/mybible.js download --all

# 4. Глобальне встановлення команди `mybible` у систему
npm link
```

Також у `package.json` доступні зручні скрипти:
```bash
npm run setup          # Зібрати проєкт і завантажити стандартний набір модулів
npm run setup:all      # Зібрати проєкт і завантажити всі 19 модулів каталогу
```

---

## Доступні модулі в каталозі (`mybible modules --remote`)

| Код (`--trans`) | Назва перекладу | Мова | Традиція Псалмів |
| :--- | :--- | :---: | :---: |
| **`ubt`** (`tub`) | Українська Біблія у перекладі Рафаїла Турконяка (УБТ) | `uk` | **LXX** |
| **`utt`** | Українська Біблія: Переклад Р. Турконяка 2011 (УТТ) | `uk` | **LXX** |
| **`ubio`** | Біблія в перекладі Івана Огієнка (1962) | `uk` | **MT** |
| **`ubio88`** | Біблія в перекладі Івана Огієнка (1988, нативний SQLite3) | `uk` | **MT** |
| **`npu`** | Новий Переклад Українською (НПУ 2022, Biblica) | `uk` | **MT** |
| **`umt`** | Свята Біблія: Сучасною Мовою (UMT 2007) | `uk` | **MT** |
| **`hom`** | Святе Письмо у перекладі Івана Хоменка (1963) | `uk` | **MT** |
| **`ukrk`** | Біблія в перекладі П. Куліша та І. Пулюя (1905) | `uk` | **MT** |
| **`fil`** | Біблія в перекладі Патріарха Філарета (2004) | `uk` | **LXX** |
| **`gyz`** | Біблія, Новітній переклад О. Гижі (2006) | `uk` | **MT** |
| **`nup`** | Новий Завіт у перекладі Ю. Попченка (2021) | `uk` | **MT** |
| **`rst`** | Русский Синодальный Перевод (РСТ) | `ru` | **LXX** |
| **`nrt`** | Новый Русский Перевод (НРП / NRT) | `ru` | **MT** |
| **`kjv`** | King James Version (KJV) | `en` | **MT** |
| **`nkjv`** | New King James Version (NKJV) | `en` | **MT** |
| **`esv`** | English Standard Version (ESV) | `en` | **MT** |
| **`nasb`** | New American Standard Bible (NASB) | `en` | **MT** |
| **`niv`** | New International Version (NIV) | `en` | **MT** |
| **`lxx`** | Greek Bible (Septuagint LXX + Greek NT) | `el` | **LXX** |

---

## Приклади використання CLI

### 1. Отримання уривка (`mybible get`)

```bash
# Читання у терміналі (pretty)
mybible get "Пс 9:10-11" --trans ubt

# Експорт у Markdown для конспекту
mybible get "Пс 9:10-11" --trans rst --format md

# Автоматичний мапінг із виведенням довідки про нумерацію (--info)
mybible get "Пс 9:22-25" --trans kjv --info

# JSON для пайплайнів та AI-агентів
mybible get "Рим 8:28" --trans npu --format json
```

### 2. Порівняння перекладів (`mybible compare`)

```bash
# Порівняння східних (LXX: ubt, rst) та західних (MT: ubio, npu, kjv, esv) перекладів
# Движок автоматично зіставить Пс 22 (LXX) із Ps 23 (MT)!
mybible compare "Пс 22:1-4" --trans ubt,rst,ubio,npu,kjv,esv

# Порівняння вірш-за-віршем (interlinear) у форматі Markdown
mybible compare "Пс 9:22-24" --trans ubt,rst,ubio,kjv --verse-by-verse --format md

# Вимкнення авто-мапінгу Псалмів (буквальні номери глав як у базі)
mybible compare "Пс 22:1-3" --trans ubt,kjv --raw-numbers
```

### 3. Управління модулями, коментарями та словниками

```bash
# Перелік локально встановлених модулів
mybible modules

# Перелік усіх доступних модулів у віддаленому каталозі
mybible modules --remote

# Дозавантаження конкретних модулів
mybible download nasb niv lxx

# Перегляд коментарів (*.cmt.mybible) та словників (*.dct.mybible)
mybible comment "Пс 22:1-6"
mybible dict "Благодать"
```

---

## Використання як TypeScript / Node.js бібліотеки

```typescript
import {
  MyBibleService,
  parseReference,
  convertPsalmReference,
  formatPassageResult,
} from 'mybible-cli';

const service = new MyBibleService();

// Отримання уривка з автоматичним мапінгом LXX <-> MT
const result = service.getPassage('Пс 22:1-6', { trans: 'esv', info: true });
console.log(formatPassageResult(result, { format: 'md' }));

// Порівняння перекладів
const comparison = service.comparePassage('Пс 9:22-25', {
  translations: ['ubt', 'rst', 'ubio', 'npu', 'kjv'],
});
```
