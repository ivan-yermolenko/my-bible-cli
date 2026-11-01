import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'node:zlib';
import { BOOK_LIST, findBookByAlias } from '../parser/book-names.js';
import type {
  ExtraRegistryItem,
  ExtraRegistryManifest,
  ModuleType,
  VersificationTradition,
} from '../types.js';

export type RemoteModuleSourceType =
  | 'sqlite'
  | 'beblia-xml'
  | 'builtin-sample'
  | 'biblequote-zip'
  | 'biblequote-dict'
  | 'strongs-json'
  | 'spurgeon-tod'
  | 'tsk-crossref';

export interface RemoteModuleCatalogItem {
  id: string;
  aliases?: string[];
  fileName: string;
  name: string;
  language: string;
  type: ModuleType;
  sourceType: RemoteModuleSourceType;
  url?: string;
  defaultPreset: boolean;
  tradition?: VersificationTradition;
}

const BEBLIA_BASE_URL = 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master';
const LYRICVERSE_BASE_URL =
  'https://raw.githubusercontent.com/0xt1m/LyricVerse-2.0/main/seed-default/BibleTranslations';
const BIBLEQUOTE_BASE_URL =
  'https://raw.githubusercontent.com/BibleQuote/BibleQuote-Modules/master/modules';
const PYEREMENKO_BASE_URL =
  'https://raw.githubusercontent.com/pyeremenko/biblequote_modules/master';
const OPENSCRIPTURES_BASE_URL =
  'https://raw.githubusercontent.com/openscriptures/strongs/master';
const SPURGEON_TOD_ZIP_URL =
  'https://github.com/lyteword/chspurgeon-tod/archive/refs/heads/main.zip';
const TSK_XREF_URL =
  'https://raw.githubusercontent.com/ariseshinestudio/TSK/main/tskxref.txt';

export const DEFAULT_EXTRA_REGISTRY_URLS = [
  'http://mybible.infoo.pro/extra.registry.json',
  'http://mb.igr.bible/.mb_private_repo/vz.registry.json',
];

export const REMOTE_MODULES_CATALOG: RemoteModuleCatalogItem[] = [
  // ==========================================
  // 1. BIBLES (.bbl.mybible)
  // ==========================================

  // 1.1 Direct Native SQLite3 downloads
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

  // 1.2 Beblia XML-to-MyBible SQLite3 builds
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

  // 1.3 New Additional Bibles
  {
    id: 'uk1903',
    fileName: 'UK1903.bbl.mybible',
    name: 'Біблія в пер. П. Куліша та І. Левицького (Відень 1903)',
    language: 'uk',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/Ukrainian1903Bible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'lcvu',
    aliases: ['lcvu+'],
    fileName: 'LCVU.bbl.mybible',
    name: 'Дослівно-смисловий переклад В. Журомського зі Стронгом (LCVu+)',
    language: 'uk',
    type: 'bible',
    sourceType: 'sqlite',
    url: 'http://mb.igr.bible/.mb_private_repo/m/LCVu+.zip',
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'igrb',
    aliases: ['igrbu+', 'igrbua+'],
    fileName: 'IGRB.bbl.mybible',
    name: 'Підрядкова грецько-українська Біблія В. Журомського (IGRBu+)',
    language: 'uk',
    type: 'bible',
    sourceType: 'sqlite',
    url: 'http://mb.igr.bible/.mb_private_repo/m/IGRBu+.zip',
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'ibs',
    fileName: 'IBS.bbl.mybible',
    name: 'Слово Жизни (IBS / Biblica)',
    language: 'ru',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/RussianSlovoBible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'rbo',
    fileName: 'RBO.bbl.mybible',
    name: 'Библия в современном русском переводе (РБО 2011)',
    language: 'ru',
    type: 'bible',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Bible_Russian_RBO2011_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'kassian',
    fileName: 'KASSIAN.bbl.mybible',
    name: 'Новый Завет. Перевод еп. Кассиана (Безобразова)',
    language: 'ru',
    type: 'bible',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Bible_Russian_Kassian_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'rst-strong',
    aliases: ['rst+'],
    fileName: 'RST-STRONG.bbl.mybible',
    name: 'Русский Синодальный Перевод с номерами Стронга',
    language: 'ru',
    type: 'bible',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Bible_Russian_RST-Strong_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'ucs',
    fileName: 'UCS.bbl.mybible',
    name: 'Библия Церковнославянская (Елизаветинская)',
    language: 'cu',
    type: 'bible',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Bible_Slavic_UCS_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'wlc',
    fileName: 'WLC.bbl.mybible',
    name: 'Westminster Leningrad Codex (Давньоєврейський Танах)',
    language: 'he',
    type: 'bible',
    sourceType: 'beblia-xml',
    url: `${BEBLIA_BASE_URL}/HebrewBible.xml`,
    defaultPreset: false,
    tradition: 'MT',
  },

  // ==========================================
  // 2. COMMENTARIES (.cmt.mybible)
  // ==========================================
  {
    id: 'ngsb',
    fileName: 'NGSB.cmt.mybible',
    name: 'Нова Женевська навчальна Біблія (R.C. Sproul / NGSB)',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${PYEREMENKO_BASE_URL}/new_geneva_study_bible.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'calvin',
    fileName: 'CALVIN.cmt.mybible',
    name: 'Жан Кальвін: Тлумачення книг Нового Завіту',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_Calvin_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'henry',
    fileName: 'HENRY.cmt.mybible',
    name: 'Меттью Генрі: Повний тлумачний коментар на всю Біблію',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_Henry_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'dauma',
    fileName: 'DAUMA.cmt.mybible',
    name: 'Йохем Даума: Дорогами Старого Завіту',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_Dauma_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'mcarthur',
    aliases: ['macarthur'],
    fileName: 'MCARTHUR.cmt.mybible',
    name: 'Джон МакАртур: Тлумачення книг Біблії (MacArthur)',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_McArthur_2020-05-20.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'macdonald',
    aliases: ['mcdonald'],
    fileName: 'MACDONALD.cmt.mybible',
    name: 'Вільям МакДональд: Біблійні коментарі для християн',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_MacDonald_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'lopukhin',
    aliases: ['lopuhin'],
    fileName: 'LOPUKHIN.cmt.mybible',
    name: 'Тлумачна Біблія О. П. Лопухіна та спадкоємців',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${PYEREMENKO_BASE_URL}/lopuhin.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'barclay',
    fileName: 'BARCLAY.cmt.mybible',
    name: 'Вільям Барклі: Коментарі до Нового Завіту',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_Barclay_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'spurgeon',
    fileName: 'SPURGEON.cmt.mybible',
    name: 'Чарльз Сперджен: Скарбниця Давида (Treasury of David)',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_Spurgeon_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'spurgeon-en',
    fileName: 'SPURGEON-EN.cmt.mybible',
    name: "Charles Spurgeon: The Treasury of David (English)",
    language: 'en',
    type: 'commentary',
    sourceType: 'spurgeon-tod',
    url: SPURGEON_TOD_ZIP_URL,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'nrt-notes',
    fileName: 'NRT-NOTES.cmt.mybible',
    name: 'Примітки та богословські коментарі до НРП (NRT)',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_NRT-Notes_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'LXX',
  },
  {
    id: 'hertz',
    fileName: 'HERTZ.cmt.mybible',
    name: 'Йосиф Герц: Коментар на Тору (П’ятикнижжя)',
    language: 'ru',
    type: 'commentary',
    sourceType: 'biblequote-zip',
    url: `${BIBLEQUOTE_BASE_URL}/Commentary_Russian_Hertz_2019-05-30.zip`,
    defaultPreset: false,
    tradition: 'MT',
  },
  {
    id: 'tsk',
    fileName: 'TSK.cmt.mybible',
    name: 'Treasury of Scripture Knowledge (TSK Cross-References)',
    language: 'en',
    type: 'commentary',
    sourceType: 'tsk-crossref',
    url: TSK_XREF_URL,
    defaultPreset: false,
    tradition: 'MT',
  },

  // ==========================================
  // 3. DICTIONARIES (.dct.mybible)
  // ==========================================
  {
    id: 'strong',
    aliases: ['strongs'],
    fileName: 'STRONG.dct.mybible',
    name: 'Повний івритський та грецький лексикон Стронга (H1-H8674, G1-G5624)',
    language: 'el/he',
    type: 'dictionary',
    sourceType: 'strongs-json',
    url: `${OPENSCRIPTURES_BASE_URL}/greek/strongs-greek-dictionary.js`,
    defaultPreset: false,
  },
  {
    id: 'ngsb-dict',
    fileName: 'NGSB-DICT.dct.mybible',
    name: 'Богословські статті та словник Нової Женевської Біблії',
    language: 'ru',
    type: 'dictionary',
    sourceType: 'biblequote-dict',
    url: `${BIBLEQUOTE_BASE_URL}/Dictionary_Russian_NGSB-Dict_2020-07-24.zip`,
    defaultPreset: false,
  },
  {
    id: 'elwell',
    fileName: 'ELWELL.dct.mybible',
    name: 'Великий біблійний та теологічний словник Волтера Елвелла',
    language: 'ru',
    type: 'dictionary',
    sourceType: 'biblequote-dict',
    url: `${BIBLEQUOTE_BASE_URL}/Dictionary_Russian_Elwell-BBD_2019-02-09.zip`,
    defaultPreset: false,
  },
  {
    id: 'nbd',
    fileName: 'NBD.dct.mybible',
    name: 'Новий Біблійний Словник (IVP / NBD)',
    language: 'ru',
    type: 'dictionary',
    sourceType: 'biblequote-dict',
    url: `${BIBLEQUOTE_BASE_URL}/Dictionary_Russian_NBD_2020-03-29.zip`,
    defaultPreset: false,
  },
  {
    id: 'brockhaus',
    fileName: 'BROCKHAUS.dct.mybible',
    name: 'Біблійна енциклопедія Брокгауза (Рінекер / Майєр)',
    language: 'ru',
    type: 'dictionary',
    sourceType: 'biblequote-dict',
    url: `${BIBLEQUOTE_BASE_URL}/Dictionary_Russian_Brockhaus_2021-06-15.zip`,
    defaultPreset: false,
  },
  {
    id: 'nikifor',
    fileName: 'NIKIFOR.dct.mybible',
    name: 'Ілюстрована біблійна енциклопедія архім. Никифора',
    language: 'ru',
    type: 'dictionary',
    sourceType: 'biblequote-dict',
    url: `${BIBLEQUOTE_BASE_URL}/Dictionary_Russian_Nikifor_2019-02-09.zip`,
    defaultPreset: false,
  },
  {
    id: 'men',
    fileName: 'MEN.dct.mybible',
    name: 'Бібліологічний словник о. Олександра Меня',
    language: 'ru',
    type: 'dictionary',
    sourceType: 'biblequote-dict',
    url: `${BIBLEQUOTE_BASE_URL}/Dictionary_Russian_Men_2019-02-14.zip`,
    defaultPreset: false,
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
 * Robustly decodes a raw Buffer into a string, automatically checking UTF-8 BOM,
 * UTF-16LE BOM, explicit charset hints, and falling back gracefully to windows-1251.
 */
export function decodeRawText(buf: Buffer, encodingHint?: string): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buf.subarray(3));
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf.subarray(2));
  }
  if (encodingHint) {
    const lower = encodingHint.toLowerCase().trim();
    if (lower.includes('1251') || lower.includes('ansi') || lower.includes('windows') || lower === '204') {
      try {
        return new TextDecoder('windows-1251').decode(buf);
      } catch {
        // fallback
      }
    }
    if (lower.includes('utf-8') || lower.includes('utf8')) {
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buf);
      } catch {
        return new TextDecoder('windows-1251').decode(buf);
      }
    }
  }

  const head = buf.subarray(0, Math.min(buf.length, 1200)).toString('latin1');
  if (/windows-1251|cp1251|charset\s*=\s*1251|desiredfontcharset\s*=\s*204/i.test(head)) {
    try {
      return new TextDecoder('windows-1251').decode(buf);
    } catch {
      // fallback
    }
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1251').decode(buf);
  }
}

/**
 * Maps BibleQuote FullName and ShortName aliases to canonical MyBible bookNumber (10..730).
 */
export function resolveBibleQuoteBookNumber(
  fullName: string,
  shortName?: string,
): number | undefined {
  let book = findBookByAlias(fullName);
  if (book) return book.bookNumber;

  const cleaned = fullName
    .replace(/^([1-3])-?[ея]\s+/i, '$1 ')
    .replace(
      /^(от|к|послание к|послание|первое послание|второе послание|третье послание|соборное послание)\s+/i,
      '',
    )
    .trim();
  book = findBookByAlias(cleaned);
  if (book) return book.bookNumber;

  if (shortName) {
    const tokens = shortName.split(/[\s,;]+/).filter(Boolean);
    for (const t of tokens) {
      const cleanT = t.replace(/\.$/, '').replace(/^([1-3])-?[ея]\s*/i, '$1');
      book = findBookByAlias(cleanT);
      if (book) return book.bookNumber;
    }
  }

  const normalizedFull = fullName
    .replace(/[^a-zA-Zа-яА-ЯіїєґІЇЄҐ0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  book = findBookByAlias(normalizedFull);
  if (book) return book.bookNumber;

  return undefined;
}

/**
 * Extracts all files from a ZIP archive Buffer into a Map<string, Buffer>.
 * Handles both compression method 0 (Stored) and 8 (Deflate).
 */
export function extractAllFilesFromZipBuffer(zipBuffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  if (zipBuffer.length < 30) {
    return files;
  }

  // 1. Search for End of Central Directory Record (EOCD signature: 0x06054b50)
  let eocdOffset = -1;
  const minSearch = Math.max(0, zipBuffer.length - 65557);
  for (let i = zipBuffer.length - 22; i >= minSearch; i--) {
    if (
      zipBuffer[i] === 0x50 &&
      zipBuffer[i + 1] === 0x4b &&
      zipBuffer[i + 2] === 0x05 &&
      zipBuffer[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

    let curCd = cdOffset;
    for (let e = 0; e < totalEntries && curCd + 46 <= zipBuffer.length; e++) {
      if (zipBuffer.readUInt32LE(curCd) !== 0x02014b50) {
        break;
      }
      const method = zipBuffer.readUInt16LE(curCd + 10);
      const compSize = zipBuffer.readUInt32LE(curCd + 20);
      const fnLen = zipBuffer.readUInt16LE(curCd + 28);
      const extraLen = zipBuffer.readUInt16LE(curCd + 30);
      const commentLen = zipBuffer.readUInt16LE(curCd + 32);
      const localHdrOffset = zipBuffer.readUInt32LE(curCd + 42);

      let rawFileName = zipBuffer.toString('utf8', curCd + 46, curCd + 46 + fnLen);
      rawFileName = rawFileName.replace(/\\/g, '/');
      curCd += 46 + fnLen + extraLen + commentLen;

      if (rawFileName.endsWith('/')) {
        continue;
      }

      if (
        localHdrOffset + 30 <= zipBuffer.length &&
        zipBuffer.readUInt32LE(localHdrOffset) === 0x04034b50
      ) {
        const localFnLen = zipBuffer.readUInt16LE(localHdrOffset + 26);
        const localExtraLen = zipBuffer.readUInt16LE(localHdrOffset + 28);
        const dataStart = localHdrOffset + 30 + localFnLen + localExtraLen;
        const dataEnd = dataStart + compSize;

        if (dataEnd <= zipBuffer.length) {
          const compData = zipBuffer.subarray(dataStart, dataEnd);
          let data: Buffer;
          if (method === 0) {
            data = Buffer.from(compData);
          } else if (method === 8) {
            data = zlib.inflateRawSync(compData);
          } else {
            continue;
          }
          files.set(rawFileName, data);
        }
      }
    }
    if (files.size > 0) {
      return files;
    }
  }

  // 2. Fallback: Parse sequentially using Local File Headers (0x04034b50)
  let cur = 0;
  while (cur + 30 <= zipBuffer.length) {
    if (zipBuffer.readUInt32LE(cur) !== 0x04034b50) {
      break;
    }
    const method = zipBuffer.readUInt16LE(cur + 8);
    const compSize = zipBuffer.readUInt32LE(cur + 18);
    const fnLen = zipBuffer.readUInt16LE(cur + 26);
    const extraLen = zipBuffer.readUInt16LE(cur + 28);
    const rawFileName = zipBuffer
      .toString('utf8', cur + 30, cur + 30 + fnLen)
      .replace(/\\/g, '/');
    const dataStart = cur + 30 + fnLen + extraLen;
    const dataEnd = compSize > 0 ? dataStart + compSize : zipBuffer.length;

    if (dataEnd <= zipBuffer.length && !rawFileName.endsWith('/')) {
      const compData = zipBuffer.subarray(dataStart, dataEnd);
      let data: Buffer;
      if (method === 0) {
        data = Buffer.from(compData);
      } else if (method === 8) {
        data = zlib.inflateRawSync(compData);
      } else {
        break;
      }
      files.set(rawFileName, data);
    }
    if (compSize > 0) {
      cur = dataEnd;
    } else {
      break;
    }
  }

  return files;
}

/**
 * Extracts the first non-directory file from a ZIP archive Buffer.
 */
export function extractFirstFileFromZipBuffer(
  zipBuffer: Buffer,
): { fileName: string; data: Buffer } {
  const allFiles = extractAllFilesFromZipBuffer(zipBuffer);
  if (allFiles.size === 0) {
    throw new Error('Buffer is not a valid ZIP archive (magic signature not found).');
  }

  for (const [fn, data] of allFiles.entries()) {
    const lower = fn.toLowerCase();
    if (
      lower.endsWith('.bbl.mybible') ||
      lower.endsWith('.cmt.mybible') ||
      lower.endsWith('.dct.mybible') ||
      lower.endsWith('.sqlite3')
    ) {
      return { fileName: path.basename(fn), data };
    }
  }

  const firstEntry = allFiles.entries().next().value;
  if (!firstEntry) {
    throw new Error('No files found in ZIP archive.');
  }
  return { fileName: path.basename(firstEntry[0]), data: firstEntry[1] };
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
      ...Object.fromEntries(Array.from({ length: 39 }, (_, i) => [i + 1, (i + 1) * 10])),
      40: 470,
      41: 480,
      42: 490,
      43: 500,
      44: 510,
      45: 590,
      46: 600,
      47: 610,
      48: 620,
      49: 630,
      50: 640,
      51: 650,
      52: 660,
      53: 670,
      54: 680,
      55: 690,
      56: 700,
      57: 710,
      58: 720,
      59: 520,
      60: 530,
      61: 540,
      62: 550,
      63: 560,
      64: 570,
      65: 580,
      66: 730,
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
      // ignore
    }
    throw err;
  } finally {
    db.close();
  }

  return { booksInserted, versesInserted };
}

/**
 * Compiles a BibleQuote module (from unzipped files Map) into a MyBible SQLite database.
 * Supports both Bible translations (`.bbl.mybible`) and commentaries (`.cmt.mybible`).
 */
export function compileBibleQuoteToSqlite(
  files: Map<string, Buffer>,
  targetFilePath: string,
  catalogItem: RemoteModuleCatalogItem,
): { entriesInserted: number; booksInserted?: number } {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(targetFilePath)) {
    fs.unlinkSync(targetFilePath);
  }

  // 1. Locate and parse bibleqt.ini
  const iniEntry = [...files.entries()].find(([fn]) => /(^|\/)bibleqt\.ini$/i.test(fn));
  if (!iniEntry) {
    throw new Error('bibleqt.ini not found in BibleQuote module archive.');
  }

  const iniText = decodeRawText(iniEntry[1]);
  let chapterSign = '<h4>';
  let defaultEncoding = 'utf-8';

  interface BqBook {
    pathName: string;
    fullName: string;
    shortName: string;
  }
  const books: BqBook[] = [];

  let curPathName = '';
  let curFullName = '';
  let curShortName = '';

  const iniLines = iniText.split(/\r?\n/);
  for (const line of iniLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith(';')) {
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim().toLowerCase();
    const val = trimmed.slice(eqIdx + 1).trim();

    if (key === 'chaptersign') {
      chapterSign = val || '<h4>';
    } else if (key === 'defaultencoding' || key === 'defaultcharset') {
      defaultEncoding = val;
    } else if (key === 'desiredfontcharset' && val === '204' && defaultEncoding === 'utf-8') {
      defaultEncoding = 'windows-1251';
    } else if (key === 'pathname') {
      if (curPathName) {
        books.push({
          pathName: curPathName,
          fullName: curFullName,
          shortName: curShortName,
        });
      }
      curPathName = val;
      curFullName = '';
      curShortName = '';
    } else if (key === 'fullname') {
      curFullName = val;
    } else if (key === 'shortname') {
      curShortName = val;
    }
  }

  if (curPathName) {
    books.push({
      pathName: curPathName,
      fullName: curFullName,
      shortName: curShortName,
    });
  }

  const db = new DatabaseSync(targetFilePath);
  let entriesInserted = 0;
  let booksInserted = 0;

  try {
    db.exec('CREATE TABLE info (name TEXT, value TEXT);');
    const insertInfo = db.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    insertInfo.run('description', catalogItem.name);
    insertInfo.run('language', catalogItem.language);
    insertInfo.run('version', '1.0');
    if (catalogItem.tradition) {
      insertInfo.run('versification', catalogItem.tradition);
    }

    const isCommentary = catalogItem.type === 'commentary';

    if (isCommentary) {
      db.exec(`
        CREATE TABLE commentaries (
          book_number NUMERIC,
          chapter_number_from NUMERIC,
          verse_number_from NUMERIC,
          chapter_number_to NUMERIC,
          verse_number_to NUMERIC,
          text TEXT
        );
      `);
    } else {
      db.exec(`
        CREATE TABLE books (book_number NUMERIC, short_name TEXT, long_name TEXT, book_color TEXT);
        CREATE TABLE verses (book_number NUMERIC, chapter NUMERIC, verse NUMERIC, text TEXT);
      `);
    }

    const insertCommentary = isCommentary
      ? db.prepare(`
          INSERT INTO commentaries (
            book_number, chapter_number_from, verse_number_from, chapter_number_to, verse_number_to, text
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
      : null;

    const insertBook = !isCommentary
      ? db.prepare('INSERT INTO books (book_number, short_name, long_name, book_color) VALUES (?, ?, ?, ?)')
      : null;
    const insertVerse = !isCommentary
      ? db.prepare('INSERT INTO verses (book_number, chapter, verse, text) VALUES (?, ?, ?, ?)')
      : null;

    db.exec('BEGIN TRANSACTION');

    const cleanVerseRegex = /<p\b[^>]*>\s*(?:<[bi]>)?\s*(\d+)\.?\s*(?:<\/[bi]>)?\s*([\s\S]*?)(?=<p\b|$)/gi;

    for (const bqBook of books) {
      const bookNumber = resolveBibleQuoteBookNumber(bqBook.fullName, bqBook.shortName);
      if (!bookNumber) {
        continue;
      }

      // Find file matching pathName (case-insensitive)
      const targetBase = path.basename(bqBook.pathName).toLowerCase();
      const contentEntry = [...files.entries()].find(([fn]) =>
        path.basename(fn).toLowerCase() === targetBase,
      );

      if (!contentEntry) {
        continue;
      }

      const fileBuf = contentEntry[1];
      const bookHtml = decodeRawText(fileBuf, defaultEncoding);
      if (bookHtml.length < 300 && /книги нет/i.test(bookHtml)) {
        continue;
      }

      const bookInfo = BOOK_LIST.find((b) => b.bookNumber === bookNumber);
      if (!isCommentary && insertBook) {
        const shortName =
          catalogItem.language === 'ru'
            ? bookInfo?.shortNameRu ?? bqBook.shortName.split(/\s+/)[0]
            : bookInfo?.shortNameUa ?? bqBook.shortName.split(/\s+/)[0];
        const longName =
          catalogItem.language === 'ru'
            ? bookInfo?.longNameRu ?? bqBook.fullName
            : bookInfo?.longNameUa ?? bqBook.fullName;
        insertBook.run(
          bookNumber,
          shortName,
          longName,
          bookNumber < 470 ? '#4a6da7' : '#8b4513',
        );
        booksInserted++;
      }

      // Split book into chapters using chapterSign or fallback
      let chapters: string[] = [];
      if (chapterSign && chapterSign !== '<h4>') {
        const escaped = chapterSign.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        chapters = bookHtml.split(new RegExp(escaped, 'i'));
      } else {
        chapters = bookHtml.split(/<h4>/i);
      }

      if (chapters.length <= 1) {
        // Fallback split
        chapters = bookHtml.split(/<h[2-4]\b[^>]*>|<G\b/i);
      }

      let chapterCounter = 0;
      for (const chChunk of chapters) {
        if (!chChunk.trim()) continue;

        // Determine chapter number
        let chapterNum = 0;
        const headSample = chChunk.slice(0, 300);
        const numMatch = headSample.match(/(?:глава|chapter|псалом|psalm)\s*(\d+)/i);
        if (numMatch) {
          chapterNum = Number.parseInt(numMatch[1], 10);
        } else if (/(?:предисловие|введение|preface|intro)/i.test(headSample)) {
          chapterNum = 0;
        } else {
          chapterCounter++;
          chapterNum = chapterCounter;
        }

        if (isCommentary && insertCommentary) {
          // Parse verse blocks from paragraphs
          const paras = chChunk.split(/<p\b[^>]*>/i);
          let currentEntry: { vFrom: number; vTo: number; text: string } | null = null;

          for (const rawP of paras) {
            const p = rawP.replace(/<\/p>/gi, '').trim();
            if (!p || p === '&nbsp;' || p === '<br>') continue;

            // Check if paragraph starts with verse number or range:
            // e.g. 1-39 ..., 1 ..., <b>1.</b>, <b>1-3</b>, <b>28. Притом...
            const vMatch = p.match(
              /^(?:<[bi]>)?\s*(\d+)(?:\s*[-–—]\s*(\d+))?\.?\s*(?:<\/[bi]>)?([\s\S]*)/i,
            );

            if (vMatch && Number.parseInt(vMatch[1], 10) < 250) {
              if (currentEntry) {
                insertCommentary.run(
                  bookNumber,
                  chapterNum,
                  currentEntry.vFrom,
                  chapterNum,
                  currentEntry.vTo,
                  currentEntry.text.trim(),
                );
                entriesInserted++;
                currentEntry = null;
              }

              let vFrom = Number.parseInt(vMatch[1], 10);
              let vTo = vMatch[2] ? Number.parseInt(vMatch[2], 10) : vFrom;

              // If leading bold block has multiple verses like "28. Притом... 29. Ибо... 30. А кого..."
              const boldMatch = p.match(/^<b>([\s\S]*?)<\/b>/i);
              if (boldMatch) {
                const nums = [...boldMatch[1].matchAll(/\b(\d+)\./g)].map((m) =>
                  Number.parseInt(m[1], 10),
                );
                if (nums.length > 1) {
                  vFrom = Math.min(...nums);
                  vTo = Math.max(...nums);
                }
              }

              currentEntry = { vFrom, vTo, text: p };
            } else {
              if (currentEntry) {
                currentEntry.text += `<p>${p}`;
              } else {
                currentEntry = { vFrom: 0, vTo: 0, text: p };
              }
            }
          }

          if (currentEntry) {
            insertCommentary.run(
              bookNumber,
              chapterNum,
              currentEntry.vFrom,
              chapterNum,
              currentEntry.vTo,
              currentEntry.text.trim(),
            );
            entriesInserted++;
          }
        } else if (insertVerse) {
          // Parse verses for Bible translation
          cleanVerseRegex.lastIndex = 0;
          let vMatch: RegExpExecArray | null;
          while ((vMatch = cleanVerseRegex.exec(chChunk)) !== null) {
            const vNum = Number.parseInt(vMatch[1], 10);
            const vText = vMatch[2]
              .replace(/<\/?[a-z0-9]+[^>]*>/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (vText) {
              insertVerse.run(bookNumber, chapterNum, vNum, vText);
              entriesInserted++;
            }
          }
        }
      }
    }

    if (isCommentary) {
      db.exec(
        'CREATE INDEX idx_commentaries_lookup ON commentaries (book_number, chapter_number_from, chapter_number_to, verse_number_from, verse_number_to);',
      );
    } else {
      db.exec('CREATE INDEX idx_verses_lookup ON verses (book_number, chapter, verse);');
    }

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    db.close();
  }

  return { entriesInserted, booksInserted };
}

/**
 * Compiles a BibleQuote dictionary module (from .idx and .htm files) into a `.dct.mybible` SQLite3 database.
 */
export function compileBibleQuoteDictToSqlite(
  files: Map<string, Buffer>,
  targetFilePath: string,
  catalogItem: RemoteModuleCatalogItem,
): { entriesInserted: number } {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(targetFilePath)) {
    fs.unlinkSync(targetFilePath);
  }

  const idxEntry = [...files.entries()].find(([fn]) => fn.toLowerCase().endsWith('.idx'));
  const htmEntry = [...files.entries()].find(([fn]) =>
    /\.(htm|html)$/i.test(fn) && !/bibleqt/i.test(fn),
  );

  if (!idxEntry || !htmEntry) {
    throw new Error('Dictionary index (.idx) or HTML content (.htm) not found in archive.');
  }

  const idxBuf = idxEntry[1];
  const htmBuf = htmEntry[1];

  let idxText: string;
  if (idxBuf.length >= 2 && idxBuf[0] === 0xff && idxBuf[1] === 0xfe) {
    idxText = new TextDecoder('utf-16le').decode(idxBuf.subarray(2));
  } else if (idxBuf.length >= 3 && idxBuf[0] === 0xef && idxBuf[1] === 0xbb && idxBuf[2] === 0xbf) {
    idxText = new TextDecoder('utf-8').decode(idxBuf.subarray(3));
  } else {
    try {
      idxText = new TextDecoder('utf-8', { fatal: true }).decode(idxBuf);
    } catch {
      idxText = new TextDecoder('windows-1251').decode(idxBuf);
    }
  }

  interface IdxItem {
    topic: string;
    offset: number;
  }
  const items: IdxItem[] = [];

  const rawLines = idxText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let pendingTopic: string | null = null;

  for (const line of rawLines) {
    if (pendingTopic === null) {
      const tabMatch = line.match(/^([^\t]+)\t+(\d+)$/);
      if (tabMatch) {
        items.push({
          topic: tabMatch[1].trim(),
          offset: Number.parseInt(tabMatch[2], 10),
        });
      } else {
        pendingTopic = line;
      }
    } else {
      if (/^\d+$/.test(line)) {
        items.push({
          topic: pendingTopic,
          offset: Number.parseInt(line, 10),
        });
        pendingTopic = null;
      } else {
        pendingTopic = line;
      }
    }
  }

  items.sort((a, b) => a.offset - b.offset);

  const db = new DatabaseSync(targetFilePath);
  let entriesInserted = 0;

  try {
    db.exec(`
      CREATE TABLE info (name TEXT, value TEXT);
      CREATE TABLE dictionary (topic TEXT, definition TEXT);
    `);

    const insertInfo = db.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    insertInfo.run('description', catalogItem.name);
    insertInfo.run('language', catalogItem.language);
    insertInfo.run('version', '1.0');

    const insertDict = db.prepare('INSERT INTO dictionary (topic, definition) VALUES (?, ?)');
    db.exec('BEGIN TRANSACTION');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.offset < 0 || item.offset >= htmBuf.length) {
        continue;
      }
      const nextOffset = i + 1 < items.length ? items[i + 1].offset : htmBuf.length;
      if (nextOffset <= item.offset) continue;

      const slice = htmBuf.subarray(item.offset, nextOffset);
      const definition = decodeRawText(slice).trim();

      if (definition) {
        insertDict.run(item.topic, definition);
        entriesInserted++;
      }
    }

    db.exec('CREATE INDEX idx_dictionary_topic ON dictionary (topic);');
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    db.close();
  }

  return { entriesInserted };
}

/**
 * Compiles OpenScriptures Strong's Hebrew and Greek dictionaries into a `STRONG.dct.mybible` SQLite3 database.
 */
export function compileStrongsJsonToSqlite(
  greekJs: string,
  hebrewJs: string,
  targetFilePath: string,
  catalogItem: RemoteModuleCatalogItem,
): { entriesInserted: number } {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(targetFilePath)) {
    fs.unlinkSync(targetFilePath);
  }

  const parseJsDict = (code: string): Record<string, Record<string, string>> => {
    const s = code.indexOf('{');
    const e = code.lastIndexOf('}') + 1;
    if (s === -1 || e <= s) {
      throw new Error('Failed to find JSON object in dictionary source.');
    }
    return JSON.parse(code.slice(s, e)) as Record<string, Record<string, string>>;
  };

  const greek = parseJsDict(greekJs);
  const hebrew = parseJsDict(hebrewJs);

  const db = new DatabaseSync(targetFilePath);
  let entriesInserted = 0;

  try {
    db.exec(`
      CREATE TABLE info (name TEXT, value TEXT);
      CREATE TABLE dictionary (topic TEXT, definition TEXT);
    `);

    const insertInfo = db.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    insertInfo.run('description', catalogItem.name);
    insertInfo.run('language', 'el/he');
    insertInfo.run('version', '1.0');

    const insertDict = db.prepare('INSERT INTO dictionary (topic, definition) VALUES (?, ?)');
    db.exec('BEGIN TRANSACTION');

    // Insert Greek entries
    for (const [key, e] of Object.entries(greek)) {
      const lemma = e.lemma ?? '';
      const translit = e.translit ?? '';
      const deriv = e.derivation ?? '';
      const def = e.strongs_def ?? '';
      const kjv = e.kjv_def ?? '';

      const html = `<b>${key}: ${lemma}</b> ${translit ? `(${translit})` : ''}<br>
${def ? `<p><b>Визначення:</b> ${def.trim()}</p>` : ''}
${deriv ? `<p><b>Походження:</b> ${deriv.trim()}</p>` : ''}
${kjv ? `<p><b>Переклад KJV:</b> ${kjv.trim()}</p>` : ''}`;

      insertDict.run(key, html);
      insertDict.run(key.toLowerCase(), html);
      entriesInserted++;
    }

    // Insert Hebrew entries
    for (const [key, e] of Object.entries(hebrew)) {
      const lemma = e.lemma ?? '';
      const translit = e.xlit ?? e.translit ?? '';
      const pron = e.pron ?? '';
      const deriv = e.derivation ?? '';
      const def = e.strongs_def ?? '';
      const kjv = e.kjv_def ?? '';

      const html = `<b>${key}: ${lemma}</b> ${translit ? `(${translit})` : ''}<br>
${pron ? `<p><b>Вимова:</b> ${pron.trim()}</p>` : ''}
${def ? `<p><b>Визначення:</b> ${def.trim()}</p>` : ''}
${deriv ? `<p><b>Походження:</b> ${deriv.trim()}</p>` : ''}
${kjv ? `<p><b>Переклад KJV:</b> ${kjv.trim()}</p>` : ''}`;

      insertDict.run(key, html);
      insertDict.run(key.toLowerCase(), html);
      entriesInserted++;
    }

    db.exec('CREATE INDEX idx_dictionary_topic ON dictionary (topic);');
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    db.close();
  }

  return { entriesInserted };
}

/**
 * Compiles Spurgeon's Treasury of David Markdown files into `SPURGEON.cmt.mybible`.
 */
export function compileSpurgeonTodToSqlite(
  zipBuffer: Buffer,
  targetFilePath: string,
  catalogItem: RemoteModuleCatalogItem,
): { entriesInserted: number } {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(targetFilePath)) {
    fs.unlinkSync(targetFilePath);
  }

  const allFiles = extractAllFilesFromZipBuffer(zipBuffer);
  const db = new DatabaseSync(targetFilePath);
  let entriesInserted = 0;

  try {
    db.exec(`
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

    const insertInfo = db.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    insertInfo.run('description', catalogItem.name);
    insertInfo.run('language', catalogItem.language);
    insertInfo.run('version', '1.0');
    insertInfo.run('versification', catalogItem.tradition ?? 'MT');

    const insertCommentary = db.prepare(`
      INSERT INTO commentaries (
        book_number, chapter_number_from, verse_number_from, chapter_number_to, verse_number_to, text
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');

    for (const [fn, buf] of allFiles.entries()) {
      if (!fn.endsWith('.md') || fn.includes('_index.md') || fn.includes('preface.md')) {
        continue;
      }

      let chapter = 0;
      const psMatch = fn.match(/psalm-(\d+)\.md/i);
      if (psMatch) {
        chapter = Number.parseInt(psMatch[1], 10);
      } else if (fn.includes('psalm-119')) {
        chapter = 119;
      } else {
        continue;
      }

      const mdText = buf.toString('utf8');
      const expoIndex = mdText.indexOf('## Exposition');

      if (expoIndex !== -1) {
        // Intro text
        const intro = mdText.slice(0, expoIndex).replace(/^---[\s\S]*?---/, '').trim();
        if (intro) {
          insertCommentary.run(190, chapter, 0, chapter, 0, intro);
          entriesInserted++;
        }

        const expoBody = mdText.slice(expoIndex + '## Exposition'.length);
        const nextH2 = expoBody.search(/\n##\s+[^\n]+/);
        const expoClean = nextH2 !== -1 ? expoBody.slice(0, nextH2) : expoBody;

        const verseRegex = /###\s*Verses?\s*(\d+)(?:\s*(?:&|and|to|-|–|—)\s*(\d+))?([\s\S]*?)(?=###\s*Verses?|$)/gi;
        let vMatch: RegExpExecArray | null;
        while ((vMatch = verseRegex.exec(expoClean)) !== null) {
          const vFrom = Number.parseInt(vMatch[1], 10);
          const vTo = vMatch[2] ? Number.parseInt(vMatch[2], 10) : vFrom;
          const text = vMatch[3].trim();
          if (text) {
            insertCommentary.run(190, chapter, vFrom, chapter, vTo, text);
            entriesInserted++;
          }
        }
      } else {
        const clean = mdText.replace(/^---[\s\S]*?---/, '').trim();
        if (clean) {
          insertCommentary.run(190, chapter, 0, chapter, 0, clean);
          entriesInserted++;
        }
      }
    }

    db.exec(
      'CREATE INDEX idx_commentaries_lookup ON commentaries (book_number, chapter_number_from, chapter_number_to, verse_number_from, verse_number_to);',
    );
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    db.close();
  }

  return { entriesInserted };
}

/**
 * Compiles Treasury of Scripture Knowledge cross-references into `TSK.cmt.mybible`.
 */
export function compileTskCrossrefsToSqlite(
  tsvText: string,
  targetFilePath: string,
  catalogItem: RemoteModuleCatalogItem,
): { entriesInserted: number } {
  const dir = path.dirname(targetFilePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(targetFilePath)) {
    fs.unlinkSync(targetFilePath);
  }

  const PROTESTANT_TO_MYBIBLE: Record<number, number> = {
    ...Object.fromEntries(Array.from({ length: 39 }, (_, i) => [i + 1, (i + 1) * 10])),
    40: 470,
    41: 480,
    42: 490,
    43: 500,
    44: 510,
    45: 590,
    46: 600,
    47: 610,
    48: 620,
    49: 630,
    50: 640,
    51: 650,
    52: 660,
    53: 670,
    54: 680,
    55: 690,
    56: 700,
    57: 710,
    58: 720,
    59: 520,
    60: 530,
    61: 540,
    62: 550,
    63: 560,
    64: 570,
    65: 580,
    66: 730,
  };

  const lines = tsvText.split(/\r?\n/);
  const grouped = new Map<string, Array<{ keyword: string; xrefs: string }>>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 6) continue;

    const bIndex = Number.parseInt(parts[0], 10);
    const chapter = Number.parseInt(parts[1], 10);
    const verse = Number.parseInt(parts[2], 10);
    const keyword = parts[4].trim();
    const xrefs = parts[5].trim();

    const bookNum = PROTESTANT_TO_MYBIBLE[bIndex];
    if (!bookNum) continue;

    const key = `${bookNum}:${chapter}:${verse}`;
    let list = grouped.get(key);
    if (!list) {
      list = [];
      grouped.set(key, list);
    }
    list.push({ keyword, xrefs });
  }

  const db = new DatabaseSync(targetFilePath);
  let entriesInserted = 0;

  try {
    db.exec(`
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

    const insertInfo = db.prepare('INSERT INTO info (name, value) VALUES (?, ?)');
    insertInfo.run('description', catalogItem.name);
    insertInfo.run('language', catalogItem.language);
    insertInfo.run('version', '1.0');
    insertInfo.run('versification', catalogItem.tradition ?? 'MT');

    const insertCommentary = db.prepare(`
      INSERT INTO commentaries (
        book_number, chapter_number_from, verse_number_from, chapter_number_to, verse_number_to, text
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');

    for (const [key, items] of grouped.entries()) {
      const [bStr, cStr, vStr] = key.split(':');
      const bNum = Number.parseInt(bStr, 10);
      const ch = Number.parseInt(cStr, 10);
      const v = Number.parseInt(vStr, 10);

      const html = items
        .map((it) => `<b>${it.keyword}:</b> ${it.xrefs.replace(/;/g, '; ')}`)
        .join('<br>\n');

      insertCommentary.run(bNum, ch, v, ch, v, html);
      entriesInserted++;
    }

    db.exec(
      'CREATE INDEX idx_commentaries_lookup ON commentaries (book_number, chapter_number_from, chapter_number_to, verse_number_from, verse_number_to);',
    );
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  } finally {
    db.close();
  }

  return { entriesInserted };
}

/**
 * Creates built-in sample commentary and dictionary.
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
    cmtStmt.run(
      190,
      9,
      1,
      9,
      39,
      '<b>Псалом 9 (LXX 9 / MT 9–10):</b> У традиції Септуагінти (LXX) Псалми 9 та 10 об’єднані в один акростиховий псалом (вірші 1–21 = MT Пс 9; вірші 22–39 = MT Пс 10).',
    );
    cmtStmt.run(
      590,
      8,
      28,
      8,
      30,
      '<b>Римлян 8:28–30: Боже провидіння та золотий ланцюг спасіння.</b> Усе сприяє до добра тим, хто любить Бога і покликаний за Його постановою.',
    );
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

export function resolveTargetModulesDir(options: {
  targetDir?: string;
  global?: boolean;
} = {}): string {
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

  if (item.sourceType === 'builtin-sample') {
    createSampleCommentaryAndDictionary(targetDir);
    return { id: item.id, filePath, skipped: false };
  }

  if (!item.url) {
    throw new Error(`Module "${item.id}" does not have a download URL.`);
  }

  options.onProgress?.(`[GET]  Downloading ${item.id} (${item.name})...`);

  if (item.sourceType === 'strongs-json') {
    // Download Greek & Hebrew Strong's dictionaries
    options.onProgress?.('[GET]  Downloading Greek Strong\'s dictionary...');
    const gRes = await fetch(
      `${OPENSCRIPTURES_BASE_URL}/greek/strongs-greek-dictionary.js`,
    );
    if (!gRes.ok) throw new Error(`Failed to download Greek Strong's: HTTP ${gRes.status}`);
    const gJs = await gRes.text();

    options.onProgress?.('[GET]  Downloading Hebrew Strong\'s dictionary...');
    const hRes = await fetch(
      `${OPENSCRIPTURES_BASE_URL}/hebrew/strongs-hebrew-dictionary.js`,
    );
    if (!hRes.ok) throw new Error(`Failed to download Hebrew Strong's: HTTP ${hRes.status}`);
    const hJs = await hRes.text();

    options.onProgress?.('[BUILD] Compiling Strong\'s Hebrew & Greek Lexicon...');
    const tmpPath = `${filePath}.tmp`;
    const stats = compileStrongsJsonToSqlite(gJs, hJs, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(`[OK]   Compiled ${item.id} (${stats.entriesInserted} entries) -> ${filePath}`);
    return { id: item.id, filePath, skipped: false };
  }

  if (item.sourceType === 'spurgeon-tod') {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to download Spurgeon TOD: HTTP ${res.status}`);
    const zipBuf = Buffer.from(await res.arrayBuffer());

    options.onProgress?.('[BUILD] Compiling Spurgeon\'s Treasury of David (150 Psalms)...');
    const tmpPath = `${filePath}.tmp`;
    const stats = compileSpurgeonTodToSqlite(zipBuf, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(`[OK]   Compiled ${item.id} (${stats.entriesInserted} sections) -> ${filePath}`);
    return { id: item.id, filePath, skipped: false };
  }

  if (item.sourceType === 'tsk-crossref') {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to download TSK cross-references: HTTP ${res.status}`);
    const tsvText = await res.text();

    options.onProgress?.('[BUILD] Compiling Treasury of Scripture Knowledge cross-references...');
    const tmpPath = `${filePath}.tmp`;
    const stats = compileTskCrossrefsToSqlite(tsvText, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(`[OK]   Compiled ${item.id} (${stats.entriesInserted} verses) -> ${filePath}`);
    return { id: item.id, filePath, skipped: false };
  }

  const response = await fetch(item.url);
  if (!response.ok) {
    throw new Error(
      `Failed to download "${item.id}" from ${item.url}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  if (item.sourceType === 'sqlite') {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isZip =
      item.url.toLowerCase().endsWith('.zip') ||
      (buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04);

    if (isZip) {
      options.onProgress?.('[UNZIP] Extracting database file from ZIP archive...');
      const extracted = extractFirstFileFromZipBuffer(buffer);
      const tmpPath = `${filePath}.tmp`;
      fs.writeFileSync(tmpPath, extracted.data);
      fs.renameSync(tmpPath, filePath);
      options.onProgress?.(`[OK]   Extracted and saved SQLite module ${item.id} -> ${filePath}`);
    } else {
      const tmpPath = `${filePath}.tmp`;
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, filePath);
      options.onProgress?.(`[OK]   Saved SQLite module ${item.id} -> ${filePath}`);
    }
  } else if (item.sourceType === 'beblia-xml') {
    const xmlText = await response.text();
    const tmpPath = `${filePath}.tmp`;
    const stats = compileBebliaXmlToSqlite(xmlText, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(
      `[OK]   Compiled ${item.id} (${stats.booksInserted} books, ${stats.versesInserted} verses) -> ${filePath}`,
    );
  } else if (item.sourceType === 'biblequote-zip') {
    options.onProgress?.('[UNZIP] Extracting BibleQuote files from ZIP archive...');
    const zipBuf = Buffer.from(await response.arrayBuffer());
    const files = extractAllFilesFromZipBuffer(zipBuf);
    options.onProgress?.(`[BUILD] Compiling BibleQuote module ${item.id} (${files.size} files)...`);
    const tmpPath = `${filePath}.tmp`;
    const stats = compileBibleQuoteToSqlite(files, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(
      `[OK]   Compiled ${item.id} (${stats.entriesInserted} entries${stats.booksInserted ? `, ${stats.booksInserted} books` : ''}) -> ${filePath}`,
    );
  } else if (item.sourceType === 'biblequote-dict') {
    options.onProgress?.('[UNZIP] Extracting dictionary files from ZIP archive...');
    const zipBuf = Buffer.from(await response.arrayBuffer());
    const files = extractAllFilesFromZipBuffer(zipBuf);
    options.onProgress?.(`[BUILD] Compiling dictionary ${item.id}...`);
    const tmpPath = `${filePath}.tmp`;
    const stats = compileBibleQuoteDictToSqlite(files, tmpPath, item);
    fs.renameSync(tmpPath, filePath);
    options.onProgress?.(`[OK]   Compiled ${item.id} (${stats.entriesInserted} topics) -> ${filePath}`);
  }

  return { id: item.id, filePath, skipped: false };
}

/**
 * Fetches an Extra Registry manifest from a remote URL.
 */
export async function fetchExtraRegistry(
  registryUrl = DEFAULT_EXTRA_REGISTRY_URLS[0],
): Promise<ExtraRegistryManifest> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(registryUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'MyBible-CLI/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch extra registry from ${registryUrl}: HTTP ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as unknown;
    if (Array.isArray(json)) {
      return {
        registry_url: registryUrl,
        modules: json as ExtraRegistryItem[],
      };
    }

    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      const rawModules = Array.isArray(obj.modules) ? obj.modules : [];
      return {
        registry_url: typeof obj.registry_url === 'string' ? obj.registry_url : registryUrl,
        name: typeof obj.name === 'string' ? obj.name : undefined,
        description: typeof obj.description === 'string' ? obj.description : undefined,
        modules: rawModules as ExtraRegistryItem[],
      };
    }

    throw new Error(`Invalid JSON format received from extra registry at ${registryUrl}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Downloads a module from an extra registry.
 */
export async function downloadFromExtraRegistry(
  moduleIdOrAbbr: string,
  registryUrl = DEFAULT_EXTRA_REGISTRY_URLS[0],
  targetDir?: string,
  options: DownloadOptions = {},
): Promise<{ id: string; filePath: string; skipped: boolean }> {
  const norm = moduleIdOrAbbr.trim().toLowerCase();
  options.onProgress?.(`[GET]  Fetching extra registry manifest from ${registryUrl}...`);
  const manifest = await fetchExtraRegistry(registryUrl);

  const matched = manifest.modules.find((item) => {
    const abbr = item.abbreviation?.toLowerCase();
    const fname = item.file_name.toLowerCase();
    const baseFname = fname.replace(/(\.bbl|\.cmt|\.dct)?\.mybible|\.sqlite3|\.zip/gi, '');
    const dlUrl = item.url || item.download_url || '';
    return (
      abbr === norm ||
      fname === norm ||
      baseFname === norm ||
      String(dlUrl).toLowerCase().endsWith(`/${norm}`) ||
      String(dlUrl).toLowerCase().endsWith(`/${norm}.zip`)
    );
  });

  if (!matched) {
    const sampleAvailable = manifest.modules
      .slice(0, 10)
      .map((m) => m.abbreviation || m.file_name)
      .join(', ');
    throw new Error(
      `Module "${moduleIdOrAbbr}" not found in extra registry (${manifest.modules.length} modules available, e.g.: ${sampleAvailable}).`,
    );
  }

  const downloadUrl = matched.url || matched.download_url;
  if (!downloadUrl) {
    throw new Error(`Module "${matched.file_name}" does not have a download URL in registry.`);
  }

  const effectiveTargetDir = resolveTargetModulesDir({ targetDir, global: options.global });
  fs.mkdirSync(effectiveTargetDir, { recursive: true });

  let destFileName = path.basename(matched.file_name);
  if (destFileName.toLowerCase().endsWith('.zip')) {
    destFileName = destFileName.slice(0, -4);
  }
  if (!destFileName.includes('.')) {
    destFileName += '.bbl.mybible';
  }

  const destFilePath = path.join(effectiveTargetDir, destFileName);
  if (!options.overwrite && fs.existsSync(destFilePath) && fs.statSync(destFilePath).size > 0) {
    options.onProgress?.(`[SKIP] ${matched.file_name} already exists at ${destFilePath}`);
    return { id: matched.abbreviation || destFileName, filePath: destFilePath, skipped: true };
  }

  options.onProgress?.(`[GET]  Downloading ${matched.file_name} from ${downloadUrl}...`);
  const res = await fetch(String(downloadUrl));
  if (!res.ok) {
    throw new Error(
      `Failed to download module from ${downloadUrl}: HTTP ${res.status} ${res.statusText}`,
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const isZip =
    String(downloadUrl).toLowerCase().endsWith('.zip') ||
    matched.file_name.toLowerCase().endsWith('.zip') ||
    (buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04);

  if (isZip) {
    options.onProgress?.('[UNZIP] Extracting database file from ZIP archive...');
    const extracted = extractFirstFileFromZipBuffer(buffer);
    const finalName = extracted.fileName || destFileName;
    const finalPath = path.join(effectiveTargetDir, finalName);
    const tmpPath = `${finalPath}.tmp`;
    fs.writeFileSync(tmpPath, extracted.data);
    fs.renameSync(tmpPath, finalPath);
    options.onProgress?.(`[OK]   Extracted and saved ${finalName} -> ${finalPath}`);
    return { id: matched.abbreviation || finalName, filePath: finalPath, skipped: false };
  }

  const tmpPath = `${destFilePath}.tmp`;
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, destFilePath);
  options.onProgress?.(`[OK]   Saved ${destFileName} -> ${destFilePath}`);
  return { id: matched.abbreviation || destFileName, filePath: destFilePath, skipped: false };
}

export async function downloadModuleBundle(
  options: DownloadOptions & {
    moduleIds?: string[];
    all?: boolean;
    preset?: boolean;
    commentaries?: boolean;
    dictionaries?: boolean;
    bibles?: boolean;
    includeSamples?: boolean;
  } = {},
): Promise<Array<{ id: string; filePath: string; skipped: boolean }>> {
  const targetDir = resolveTargetModulesDir(options);
  let itemsToDownload: RemoteModuleCatalogItem[] = [];

  if (options.all) {
    itemsToDownload = [...REMOTE_MODULES_CATALOG];
  } else if (options.commentaries) {
    itemsToDownload = REMOTE_MODULES_CATALOG.filter((m) => m.type === 'commentary');
  } else if (options.dictionaries) {
    itemsToDownload = REMOTE_MODULES_CATALOG.filter((m) => m.type === 'dictionary');
  } else if (options.bibles) {
    itemsToDownload = REMOTE_MODULES_CATALOG.filter((m) => m.type === 'bible');
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

  if (
    options.includeSamples !== false &&
    (!options.moduleIds || options.moduleIds.length === 0) &&
    !options.commentaries &&
    !options.dictionaries &&
    !options.bibles
  ) {
    const samples = createSampleCommentaryAndDictionary(targetDir);
    options.onProgress?.(
      `[OK]   Created sample commentary (${path.basename(samples.commentaryPath)}) and dictionary (${path.basename(samples.dictionaryPath)})`,
    );
  }

  return results;
}
