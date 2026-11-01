import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { BOOK_LIST } from '../parser/book-names.js';
import type { ModuleType, VersificationTradition } from '../types.js';

export interface RemoteModuleCatalogItem {
  id: string;
  aliases?: string[];
  fileName: string;
  name: string;
  language: string;
  type: ModuleType;
  sourceType: 'sqlite' | 'beblia-xml' | 'builtin-sample';
  url?: string;
  defaultPreset: boolean;
  tradition?: VersificationTradition;
}

const BEBLIA_BASE_URL = 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master';
const LYRICVERSE_BASE_URL =
  'https://raw.githubusercontent.com/0xt1m/LyricVerse-2.0/main/seed-default/BibleTranslations';

export const REMOTE_MODULES_CATALOG: RemoteModuleCatalogItem[] = [
  // Direct Native .SQLite3 downloads
  {
    id: 'ubio88',
    fileName: 'UBIO88.bbl.mybible',
    name: 'Біблія в пер. Івана Огієнка 1988 (UBIO88)',
    language: 'uk',
    type: 'bible',
    sourceType: 'sqlite',
    url: `${LYRICVERSE_BASE_URL}/UBIO'88.SQLite3`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'esv',
    fileName: 'ESV.bbl.mybible',
    name: 'English Standard Version (ESV)',
    language: 'en',
    type: 'bible',
    sourceType: 'sqlite',
    url: `${LYRICVERSE_BASE_URL}/ESV.SQLite3`,
    defaultPreset: true,
    tradition: 'MT',
  },

  // Beblia XML-to-MyBible SQLite3 builds
  {
    id: 'ubt',
    aliases: ['tub'],
    fileName: 'UBT.bbl.mybible',
    name: 'Українська Біблія у перекладі Рафаїла Турконяка (УБТ / LXX)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/UkrainianTUBBible.xml`,
    defaultPreset: true,
    tradition: 'LXX',
  },
  {
    id: 'utt',
    fileName: 'UTT.bbl.mybible',
    name: 'Українська Біблія: Переклад Р. Турконяка 2011 (УТТ)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian2011Bible.xml`,
    defaultPreset: true,
    tradition: 'LXX',
  },
  {
    id: 'ubio',
    fileName: 'UBIO.bbl.mybible',
    name: 'Біблія в перекладі Івана Огієнка (UBIO 1962)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/UkrainianBible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'npu',
    fileName: 'NPU.bbl.mybible',
    name: 'Новий Переклад Українською (НПУ 2022, Biblica)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian2022Bible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'umt',
    fileName: 'UMT.bbl.mybible',
    name: 'Свята Біблія: Сучасною Мовою (UMT 2007)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/UkrainianUMTBible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'hom',
    fileName: 'HOM.bbl.mybible',
    name: 'Святе Письмо у перекладі Івана Хоменка (1963)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/UkrainianHOMBible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'ukrk',
    fileName: 'UKRK.bbl.mybible',
    name: 'Біблія в перекладі П. Куліша та І. Пулюя (1905)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian1905Bible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'fil',
    fileName: 'FIL.bbl.mybible',
    name: 'Біблія в перекладі Патріарха Філарета (2004)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian2004Bible.xml`,
    defaultPreset: true,
    tradition: 'LXX',
  },
  {
    id: 'gyz',
    fileName: 'GYZ.bbl.mybible',
    name: 'Біблія, Новітній переклад О. Гижі (2006)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian2006Bible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'nup',
    fileName: 'NUP.bbl.mybible',
    name: 'Новий Завіт у перекладі Ю. Попченка (2021)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian2021Bible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'rst',
    fileName: 'RST.bbl.mybible',
    name: 'Русский Синодальный Перевод (РСТ)',
    language: 'ru',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/RussianSynodalBible.xml`,
    defaultPreset: true,
    tradition: 'LXX',
  },
  {
    id: 'nrt',
    fileName: 'NRT.bbl.mybible',
    name: 'Новый Русский Перевод (НРП / NRT)',
    language: 'ru',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/RussianNRTBible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'kjv',
    fileName: 'KJV.bbl.mybible',
    name: 'King James Version (KJV)',
    language: 'en',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/EnglishKJBible.xml`,
    defaultPreset: true,
    tradition: 'MT',
  },
  {
    id: 'nkjv',
    fileName: 'NKJV.bbl.mybible',
    name: 'New King James Version (NKJV)',
    language: 'en',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/EnglishNKJBible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'nasb',
    fileName: 'NASB.bbl.mybible',
    name: 'New American Standard Bible (NASB)',
    language: 'en',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/EnglishNASBBible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'niv',
    fileName: 'NIV.bbl.mybible',
    name: 'New International Version (NIV)',
    language: 'en',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/EnglishNIVBible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'lxx',
    fileName: 'LXX.bbl.mybible',
    name: 'Greek Bible (Septuagint LXX + Greek NT)',
    language: 'el',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/GreekBible.xml`,
    defaultPreset: false,
    tradition: 'LXX',
  },
];

export function findCatalogModule(idOrAlias: string): RemoteModuleCatalogItem | undefined {
  const norm = idOrAlias.trim().toLowerCase();
  return REMOTE_MODULES_CATALOG.find(
    (item) =>
      item.id.toLowerCase() === norm ||
      (item.aliases && item.aliases.some((a) => a.toLowerCase() === norm)),
  );
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
}

/**
 * Compiles a Beblia Holy-Bible-XML-Format XML string into a MyBible `.bbl.mybible` SQLite3 database.
 */
export function compileBebliaXmlToSqlite(
  xmlContent: string,
  targetFilePath: string,
  catalogItem: RemoteModuleCatalogItem,
): { booksInserted: number; versesInserted: number } {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(targetFilePath)) {
    fs.unlinkSync(targetFilePath);
  }

  const db = new DatabaseSync(targetFilePath);
  let booksInserted = 0;
  let versesInserted = 0;

  try {
    db.exec(`
      CREATE TABLE info (name TEXT, value TEXT);
      CREATE TABLE books (book_number NUMERIC, short_name TEXT, long_name TEXT, book_color TEXT);
      CREATE TABLE verses (book_number NUMERIC, chapter NUMERIC, verse NUMERIC, text TEXT);
    `);

    const insertInfo = db.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    const insertBook = db.prepare(
      'INSERT INTO books (book_number, short_name, long_name, book_color) VALUES (?, ?, ?, ?)',
    );
    const insertVerse = db.prepare(
      'INSERT INTO verses (book_number, chapter, verse, text) VALUES (?, ?, ?, ?)',
    );

    db.exec('BEGIN TRANSACTION');

    insertInfo.run('description', catalogItem.name);
    insertInfo.run('language', catalogItem.language);
    insertInfo.run('version', '1.0');
    if (catalogItem.tradition) {
      insertInfo.run('versification', catalogItem.tradition);
    }

    const useCyrillicNames =
      catalogItem.language === 'uk' || catalogItem.language === 'ru';

    // Standard Protestant book index (1..66) -> Canonical MyBible book_number
    const PROTESTANT_TO_MYBIBLE_BOOK_NUMBER: Record<number, number> = {
      // OT 1..39 -> 10..390
      ...Object.fromEntries(Array.from({ length: 39 }, (_, i) => [i + 1, (i + 1) * 10])),
      // NT 40..66:
      40: 470, // Matthew
      41: 480, // Mark
      42: 490, // Luke
      43: 500, // John
      44: 510, // Acts
      45: 590, // Romans
      46: 600, // 1 Corinthians
      47: 610, // 2 Corinthians
      48: 620, // Galatians
      49: 630, // Ephesians
      50: 640, // Philippians
      51: 650, // Colossians
      52: 660, // 1 Thessalonians
      53: 670, // 2 Thessalonians
      54: 680, // 1 Timothy
      55: 690, // 2 Timothy
      56: 700, // Titus
      57: 710, // Philemon
      58: 720, // Hebrews
      59: 520, // James
      60: 530, // 1 Peter
      61: 540, // 2 Peter
      62: 550, // 1 John
      63: 560, // 2 John
      64: 570, // 3 John
      65: 580, // Jude
      66: 730, // Revelation
    };

    const bookRegex = /<book\b[^>]*number=["'](\d+)["'][^>]*>([\s\S]*?)<\/book>/gi;
    const chapterRegex = /<chapter\b[^>]*number=["'](\d+)["'][^>]*>([\s\S]*?)<\/chapter>/gi;
    const verseRegex = /<verse\b[^>]*number=["'](\d+)["'][^>]*>([\s\S]*?)<\/verse>/gi;

    let bookMatch: RegExpExecArray | null;
    while ((bookMatch = bookRegex.exec(xmlContent)) !== null) {
      const bookIndex = Number.parseInt(bookMatch[1], 10);
      const bookBody = bookMatch[2];
      const targetBookNum = PROTESTANT_TO_MYBIBLE_BOOK_NUMBER[bookIndex];
      const bookInfo = targetBookNum
        ? BOOK_LIST.find((b) => b.bookNumber === targetBookNum)
        : BOOK_LIST[bookIndex - 1];
      if (!bookInfo) {
        continue;
      }

      const shortName = useCyrillicNames
        ? catalogItem.language === 'ru'
          ? bookInfo.shortNameRu
          : bookInfo.shortNameUa
        : bookInfo.shortNameEn;
      const longName = useCyrillicNames
        ? catalogItem.language === 'ru'
          ? bookInfo.longNameRu
          : bookInfo.longNameUa
        : bookInfo.longNameEn;

      insertBook.run(
        bookInfo.bookNumber,
        shortName,
        longName,
        bookInfo.bookNumber < 470 ? '#4a6da7' : '#8b4513',
      );
      booksInserted++;

      chapterRegex.lastIndex = 0;
      let chapterMatch: RegExpExecArray | null;
      while ((chapterMatch = chapterRegex.exec(bookBody)) !== null) {
        const chapterNum = Number.parseInt(chapterMatch[1], 10);
        const chapterBody = chapterMatch[2];

        verseRegex.lastIndex = 0;
        let verseMatch: RegExpExecArray | null;
        while ((verseMatch = verseRegex.exec(chapterBody)) !== null) {
          const verseNum = Number.parseInt(verseMatch[1], 10);
          const rawVerseText = decodeXmlEntities(verseMatch[2]).replace(/\s+/g, ' ').trim();
          insertVerse.run(bookInfo.bookNumber, chapterNum, verseNum, rawVerseText);
          versesInserted++;
        }
      }
    }

    db.exec('CREATE INDEX idx_verses_lookup ON verses (book_number, chapter, verse);');
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  } finally {
    db.close();
  }

  return { booksInserted, versesInserted };
}

/**
 * Creates a built-in sample commentary (`sample.cmt.mybible`) and dictionary (`sample.dct.mybible`)
 * in the target directory so `mybible comment` and `mybible dict` work out of the box.
 */
export function createSampleCommentaryAndDictionary(targetDir: string): {
  commentaryPath: string;
  dictionaryPath: string;
} {
  fs.mkdirSync(targetDir, { recursive: true });

  const commentaryPath = path.join(targetDir, 'sample.cmt.mybible');
  if (fs.existsSync(commentaryPath)) {
    fs.unlinkSync(commentaryPath);
  }
  const cmtDb = new DatabaseSync(commentaryPath);
  try {
    cmtDb.exec(`
      CREATE TABLE info (name TEXT, value TEXT);
      CREATE TABLE commentaries (
        book_number NUMERIC,
        chapter_number_from NUMERIC,
        verse_number_from NUMERIC,
        chapter_number_to NUMERIC,
        verse_number_to NUMERIC,
        text TEXT
      );
    `);
    cmtDb.exec('BEGIN TRANSACTION');
    const infoStmt = cmtDb.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    infoStmt.run('description', 'Біблійний богословський коментар (Sample Commentary)');
    infoStmt.run('language', 'uk');

    const cmtStmt = cmtDb.prepare(`
      INSERT INTO commentaries (
        book_number, chapter_number_from, verse_number_from, chapter_number_to, verse_number_to, text
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Psalms 22 / 23
    cmtStmt.run(
      190,
      22,
      1,
      22,
      6,
      '<b>Псалом 22 (MT 23): Господь — Пастир мій.</b> Давид оспівує Божу вірність, провід та захист навіть у долині смертної тіні.',
    );
    cmtStmt.run(
      190,
      23,
      1,
      23,
      6,
      '<b>Psalm 23 (LXX 22): The Lord is my Shepherd.</b> A classic psalm of trust in God’s providence and covenantal care.',
    );
    // Psalms 9
    cmtStmt.run(
      190,
      9,
      1,
      9,
      39,
      '<b>Псалом 9 (LXX 9 / MT 9–10):</b> У традиції Септуагінти (LXX) Псалми 9 та 10 об’єднані в один акростиховий псалом (вірші 1–21 = MT Пс 9; вірші 22–39 = MT Пс 10).',
    );
    // Romans 8:28
    cmtStmt.run(
      590,
      8,
      28,
      8,
      30,
      '<b>Римлян 8:28–30: Боже провидіння та золотий ланцюг спасіння.</b> Усе сприяє до добра тим, хто любить Бога і покликаний за Його постановою.',
    );
    // John 1:1
    cmtStmt.run(
      500,
      1,
      1,
      1,
      5,
      '<b>Івана 1:1–5: Пролог Євангелія.</b> Споконвічне Слово (Логос) було з Богом і було Бог; через Нього постало все творіння.',
    );
    cmtDb.exec('COMMIT');
  } finally {
    cmtDb.close();
  }

  const dictionaryPath = path.join(targetDir, 'sample.dct.mybible');
  if (fs.existsSync(dictionaryPath)) {
    fs.unlinkSync(dictionaryPath);
  }
  const dctDb = new DatabaseSync(dictionaryPath);
  try {
    dctDb.exec(`
      CREATE TABLE info (name TEXT, value TEXT);
      CREATE TABLE dictionary (topic TEXT, definition TEXT);
    `);
    dctDb.exec('BEGIN TRANSACTION');
    const infoStmt = dctDb.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    infoStmt.run('description', 'Біблійний богословський словник (Sample Dictionary)');
    infoStmt.run('language', 'uk');

    const dctStmt = dctDb.prepare('INSERT INTO dictionary (topic, definition) VALUES (?, ?)');
    dctStmt.run(
      'Благодать',
      '<b>Благодать (грец. χάρις, charis)</b> — незаслужена Божа прихильність, милість і спасительна дія Бога до грішної людини в Ісусі Христі.',
    );
    dctStmt.run(
      'Grace',
      '<b>Grace (Greek: charis)</b> — Unmerited divine favor and sovereign saving love bestowed through Jesus Christ.',
    );
    dctStmt.run(
      'Завіт',
      '<b>Завіт (євр. berith, грец. diatheke)</b> — урочиста угода та союз, який Бог укладає зі Своїм народом на підставі обітниці та крові жертви.',
    );
    dctStmt.run(
      'Септуагінта',
      '<b>Септуагінта (LXX)</b> — переклад Старого Завіту давньогрецькою мовою (III–II ст. до Р.Х.), який має власну традицію нумерації Псалмів (Пс 9–146).',
    );
    dctStmt.run(
      'Логос',
      '<b>Логос (грец. Λόγος)</b> — Боже Слово, друга Особа Пресвятої Трійці, Господь Ісус Христос (Ів. 1:1, 14).',
    );
    dctDb.exec('COMMIT');
  } finally {
    dctDb.close();
  }

  return { commentaryPath, dictionaryPath };
}

export interface DownloadOptions {
  targetDir?: string;
  global?: boolean;
  overwrite?: boolean;
  onProgress?: (message: string) => void;
}

export function resolveTargetModulesDir(options: { targetDir?: string; global?: boolean } = {}): string {
  if (options.targetDir) {
    return path.resolve(options.targetDir);
  }
  if (options.global) {
    return path.join(os.homedir(), '.local', 'share', 'mybible', 'modules');
  }
  return path.resolve(process.cwd(), 'modules');
}

export async function downloadAndInstallModule(
  idOrItem: string | RemoteModuleCatalogItem,
  options: DownloadOptions = {},
): Promise<{ id: string; filePath: string; skipped: boolean }> {
  const item =
    typeof idOrItem === 'string' ? findCatalogModule(idOrItem) : idOrItem;
  if (!item) {
    throw new Error(
      `Unknown remote module "${String(idOrItem)}". Run "mybible modules --remote" to see available modules.`,
    );
  }

  const targetDir = resolveTargetModulesDir(options);
  fs.mkdirSync(targetDir, { recursive: true });
  const filePath = path.join(targetDir, item.fileName);

  if (!options.overwrite && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    options.onProgress?.(`[SKIP] ${item.id} (${item.fileName}) already exists at ${filePath}`);
    return { id: item.id, filePath, skipped: true };
  }

  if (!item.url) {
    throw new Error(`Module "${item.id}" does not have a download URL.`);
  }

  options.onProgress?.(`[GET]  Downloading ${item.id} (${item.name})...`);
  const response = await fetch(item.url);
  if (!response.ok) {
    throw new Error(
      `Failed to download "${item.id}" from ${item.url}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  if (item.sourceType === 'sqlite') {
    const arrayBuffer = await response.arrayBuffer();
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(`[OK]   Saved SQLite module ${item.id} -> ${filePath}`);
  } else if (item.sourceType === 'beblia-xml') {
    const xmlText = await response.text();
    const tmpPath = `${filePath}.tmp`;
    const stats = compileBebliaXmlToSqlite(xmlText, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(
      `[OK]   Compiled ${item.id} (${stats.booksInserted} books, ${stats.versesInserted} verses) -> ${filePath}`,
    );
  }

  return { id: item.id, filePath, skipped: false };
}

export async function downloadModuleBundle(
  options: DownloadOptions & {
    moduleIds?: string[];
    all?: boolean;
    preset?: boolean;
    includeSamples?: boolean;
  } = {},
): Promise<Array<{ id: string; filePath: string; skipped: boolean }>> {
  const targetDir = resolveTargetModulesDir(options);
  let itemsToDownload: RemoteModuleCatalogItem[] = [];

  if (options.all) {
    itemsToDownload = [...REMOTE_MODULES_CATALOG];
  } else if (options.moduleIds && options.moduleIds.length > 0) {
    for (const rawId of options.moduleIds) {
      const found = findCatalogModule(rawId);
      if (!found) {
        throw new Error(
          `Unknown module "${rawId}" in catalog. Use "mybible modules --remote" to list available IDs.`,
        );
      }
      itemsToDownload.push(found);
    }
  } else {
    // Default preset bundle
    itemsToDownload = REMOTE_MODULES_CATALOG.filter((m) => m.defaultPreset);
  }

  const results: Array<{ id: string; filePath: string; skipped: boolean }> = [];
  for (const item of itemsToDownload) {
    const res = await downloadAndInstallModule(item, { ...options, targetDir });
    results.push(res);
  }

  if (options.includeSamples !== false && (!options.moduleIds || options.moduleIds.length === 0)) {
    const samples = createSampleCommentaryAndDictionary(targetDir);
    options.onProgress?.(
      `[OK]   Created sample commentary (${path.basename(samples.commentaryPath)}) and dictionary (${path.basename(samples.dictionaryPath)})`,
    );
  }

  return results;
}
