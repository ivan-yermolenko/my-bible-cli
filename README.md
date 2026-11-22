# MyBible CLI Toolkit (`mybible`)

Швидкий, автономний CLI-застосунок та TypeScript/Node.js бібліотека для локальної роботи з модулями формату **MyBible** (`.SQLite3`, `.bbl.mybible`, `.cmt.mybible`, `.dct.mybible`) з вбудованим движком канонічного мапінгу Псалмів між східною (**LXX** — Септуаґінта / УБТ / РСТ) та західною (**MT** — Масоретська / KJV / ESV / НПУ / UBIO) традиціями.

> 🤖 **Для AI-агентів та LLM-пайплайнів:** Повний операційний контракт, шпаргалку викликів, повний реєстр модулів, математичну матрицю зсувів Псалмів та опис HTTP REST API дивіться у [AGENTS.md](AGENTS.md).

---

## Ключові можливості

- **Миттєвий доступ (< 50 мс холодний старт):** Працює на вбудованому синхронному рушії `node:sqlite` (Node.js 22+) без жодних C++ залежностей (`node-gyp`).
- **Ізоморфне ядро (`mybible-cli/core`) + HTTP REST API (`mybible serve`):** Ядро не залежить від `node:fs` або `node:sqlite` — готове для браузера (`sql.js` / `wa-sqlite`), Edge Workers та веб-фронтенду.
- **100 попередньо налаштованих модулів (`78` перекладів Біблії, `14` коментарів, `8` словників):** Розгортання з нуля на будь-якій машині однією командою `mybible setup` або `mybible download --all`.
- **Розумний парсер посилань (UA / RU / EN):** Розпізнає посилання у будь-якому форматі (`Пс 9:10-15`, `Псалом 22`, `Psalms 23:1-6`, `Рим 8:28`, `Ин 3:16`, `Ів 3:16`, `1Кор 13:4-8`).
- **Psalms Versification Engine (LXX ↔ MT):**
  - Автоматично визначає традицію нумерації кожного модуля (за структурою Псалма 9 у самій базі даних SQLite).
  - Безшовно синхронізує вірші під час читання та порівняння перекладів (наприклад, `Пс 9:22-25` у LXX $\leftrightarrow$ `Ps 10:1-4` у MT; `Пс 22:1-6` у LXX $\leftrightarrow$ `Ps 23:1-6` у MT; розбиття `Пс 113`, `114–115`, `146–147`).
- **Діагностика книжкового складу (`missingBookHint`):** Якщо запитана книга відсутня в неповному модулі (наприклад, Старий Завіт у `nup` чи Буття у `npu`), CLI точно пояснює, які книги містить модуль.
- **4 формати експорту:** `pretty`, `md`, `raw`, `json`.

---

## Швидке розгортання з нуля (на будь-якій машині)

```bash
# 1. Клонування репозиторію
git clone https://github.com/ivan-yermolenko/my-bible-cli.git
cd my-bible-cli

# 2. Встановлення залежностей та збірка
npm install
npm run build

# 3. Завантаження стартового набору (або --all для всіх 100 модулів)
node --no-warnings bin/mybible.js setup
# або всі модулі каталогу:
node --no-warnings bin/mybible.js download --all

# 4. Глобальне встановлення команди `mybible` у систему
npm link
```

Також у `package.json` доступні скрипти:
```bash
npm run setup          # Зібрати проєкт і завантажити стандартний набір модулів
npm run setup:all      # Зібрати проєкт і завантажити всі модулі каталогу
```

---

## Модулі в каталозі (`mybible modules --remote`)

Повний детальний реєстр усіх **100 модулів** наведено в [AGENTS.md](AGENTS.md#3-повний-реєстр-локально-встановлених-модулів-modules--100-модулів).

### Переклади Біблії (78 модулів)
- **Українські (16):** `ubt` (`tub`, УБТ Турконяка, LXX), `utt` (УТТ 2011, LXX), `ubio` (Огієнко 1962, MT), `ubio88` (Огієнко 1988, LXX), `cuv` (`cuv23`, `sup` — Сучасний переклад УБТ 2023, MT), `npu` (НПУ 2022 Biblica: НЗ + Псалми, LXX), `umt` (Сучасною мовою 2007, MT), `hom` (Хоменко 1963, MT), `ukrk` (Куліш/Пулюй 1905, MT), `uk1903` (Куліш/Левицький 1903, MT), `fil` (Філарет 2004, LXX), `gyz` (Гижа 2006, LXX), `ukder` (Деркач 1992, MT), `nup` (Попченко 2021, НЗ, MT), `lcvu` (Журомський зі Стронгом, LXX), `igrb` (грецько-український підрядник, LXX).
- **Російські та церковнослов'янські (11):** `rst`, `rst-strong`, `bti` (`kulakov`, Заокська Біблія 2015, LXX), `nrt`, `ibs`, `rbo`, `jnt` (Єврейський НЗ Стерна), `desn` (А. Десницький), `tnhr` (ТаНаХ Йосифона), `kassian` (НЗ), `ucs`.
- **Англійські (39):** `esv`, `kjv`, `nkjv`, `nasb`, `niv`, `lsb`, `net`, `csb17` (`csb`), `nlt`, `bsb`, `amp`, `ylt`, `gnv`, `lxxe` (Brenton's Septuagint), `rsv`, `asv`, `web`, `msg`, `ceb`, `isv`, `mev`, `cjb`, `tlv`, `ts2009`, `drb`, `nrsvce`, `njb1985`, `spe`, `lbp`, `lsv`, `rsv2ce`, `nabre`, `cevd`, `auv`, `gntd`, `erv`, `gnt`, `nlv`, `wpnt`.
- **Мови оригіналу та Латина (12):**
  - Грецька: `lxx`, `na28`, `sblgnt`, `tr`, `tisch`, `ntgt`.
  - Давньоєврейська: `wlc`, `wlca` (з оголосовками та Стронгом), `wlcc`, `hac` (Алеппський кодекс), `dhnt` (Єврейський НЗ Деліча).
  - Латинська: `vulg` (Biblia Sacra Vulgata).

### Коментарі (14 модулів) та Словники (8 модулів)
- **Коментарі:** `ngsb` (Нова Женевська Біблія), `calvin` (Жан Кальвін, НЗ), `henry` (Меттью Генрі), `dauma` (Йохем Даума, СЗ), `mcarthur` (Джон МакАртур), `macdonald` (Вільям МакДональд), `spurgeon` / `spurgeon-en` («Скарбниця Давида», Псалми), `lopukhin` (Лопухін), `barclay` (Вільям Барклі), `nrt-notes`, `hertz` (Й. Герц, Тора), `tsk` (Treasury of Scripture Knowledge), `sample`.
- **Словники:** `strong` (14 298 статей H/G), `ngsb-dict`, `elwell`, `nbd`, `brockhaus`, `nikifor`, `men`, `sample`.

---

## Приклади використання CLI

### 1. Отримання уривка (`mybible get`)

```bash
# Читання у терміналі (pretty)
mybible get "Пс 9:10-11" --trans ubt
mybible get "Пс 22:1-6" --trans npu

# Експорт у Markdown для конспекту
mybible get "Пс 9:10-11" --trans cuv --format md

# Автоматичний мапінг із виведенням довідки про нумерацію (--info)
mybible get "Пс 9:22-25" --trans kjv --info

# JSON для пайплайнів та AI-агентів
mybible get "Рим 8:28" --trans npu --format json
```

### 2. Порівняння перекладів (`mybible compare`)

```bash
# Порівняння східних (LXX: ubt, bti, npu) та західних (MT: cuv, ubio, kjv, esv) перекладів
# Движок автоматично зіставить Пс 22 (LXX) із Ps 23 (MT)!
mybible compare "Пс 22:1-4" --trans ubt,cuv,bti,npu,kjv,esv

# Порівняння вірш-за-віршем у форматі Markdown
mybible compare "Пс 9:22-24" --trans ubt,rst,ubio,kjv --verse-by-verse --format md

# Вимкнення авто-мапінгу Псалмів (буквальні номери глав як у базі)
mybible compare "Пс 22:1-3" --trans ubt,kjv --raw-numbers
```

### 3. Пошук, книги, коментарі, словники та REST API

```bash
# Повнотекстовий пошук
mybible search "Благодать" --trans ubt --testament nt --limit 10

# Перелік книг у модулі
mybible books --trans npu

# Коментарі та словники
mybible comment "Рим 8:28" --mod calvin --format md
mybible dict "G25" --mod strong --format md

# Локальний HTTP REST API сервер для веб-інтерфейсу
mybible serve --port 3333
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
