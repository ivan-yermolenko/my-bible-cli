import {
  BOOK_LIST,
  findBookByAlias,
  getBookByNumber,
} from '../parser/book-names.js';
import { parseReference } from '../parser/reference-parser.js';
import type {
  BibleSearchOptions,
  BibleSearchResult,
  BibleVerse,
  ChapterSummary,
  CleanTextOptions,
  CommentaryEntry,
  DictionaryEntry,
  ModuleBookSummary,
  ModuleMetadata,
  ModuleProvider,
  ModuleType,
  OutputFormat,
  ParsedReference,
  PassageQueryResult,
  PsalmConversionResult,
  SqlStorageDriver,
  VersificationTradition,
} from '../types.js';
import { cleanMyBibleText } from '../utils/text-cleaner.js';
import {
  convertPsalmReference,
  describePsalmVersification,
  mapSinglePsalmVerse,
} from '../versification/psalms-mapper.js';

export interface GetPassageOptions {
  trans?: string;
  format?: OutputFormat;
  info?: boolean;
  keepStrongs?: boolean;
  keepNotes?: boolean;
  rawNumbers?: boolean;
  sourceTradition?: VersificationTradition;
}

export interface ComparePassageOptions {
  translations?: string[];
  format?: OutputFormat;
  info?: boolean;
  keepStrongs?: boolean;
  keepNotes?: boolean;
  rawNumbers?: boolean;
}

const KNOWN_LXX_MODULE_IDS = new Set([
  'ubt',
  'tub',
  'rst',
  'rst+',
  'mp',
  'ogienko-lxx',
  'utt',
  'fil',
  'lxx',
  'csl',
  'eliz',
]);

interface BookRow {
  book_number: number;
  short_name?: string;
  long_name?: string;
}

/**
 * Universal isomorphic Bible/Commentary/Dictionary database wrapper.
 * Operates purely on any `SqlStorageDriver` without any Node.js OS/FS/SQLite dependencies.
 */
export class IsomorphicBibleModule {
  public readonly driver: SqlStorageDriver;
  public readonly id: string;
  public readonly filePath: string;
  private cachedTables?: Set<string>;
  private cachedMetadata?: Map<string, ModuleMetadata>;
  private cachedBooks?: Map<number, { shortName?: string; longName?: string }>;
  private cachedCanonicalToModuleBookNum?: Map<number, number>;

  constructor(driver: SqlStorageDriver, id = 'bible', filePath = id) {
    this.driver = driver;
    this.id = id;
    this.filePath = filePath;
  }

  public getTableNames(): Set<string> {
    if (this.cachedTables) {
      return this.cachedTables;
    }
    const rows = this.driver.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'view')",
    );
    this.cachedTables = new Set(rows.map((r) => String(r.name).toLowerCase()));
    return this.cachedTables;
  }

  public getBooksMap(): Map<number, { shortName?: string; longName?: string }> {
    if (this.cachedBooks) {
      return this.cachedBooks;
    }
    this.cachedBooks = new Map();
    const tables = this.getTableNames();
    const booksTable = tables.has('books')
      ? 'books'
      : tables.has('books_all')
        ? 'books_all'
        : undefined;

    if (!booksTable) {
      return this.cachedBooks;
    }

    try {
      const rows = this.driver.all<BookRow>(
        `SELECT book_number, short_name, long_name FROM ${booksTable}`,
      );
      for (const row of rows) {
        this.cachedBooks.set(Number(row.book_number), {
          shortName: row.short_name ? String(row.short_name).trim() : undefined,
          longName: row.long_name ? String(row.long_name).trim() : undefined,
        });
      }
    } catch {
      // Ignore if schema of books table differs
    }

    return this.cachedBooks;
  }

  public getCanonicalToModuleBookMap(): Map<number, number> {
    if (this.cachedCanonicalToModuleBookNum) {
      return this.cachedCanonicalToModuleBookNum;
    }
    this.cachedCanonicalToModuleBookNum = new Map();
    const booksMap = this.getBooksMap();
    for (const [moduleBookNum, info] of booksMap.entries()) {
      const matched =
        (info.longName ? findBookByAlias(info.longName) : undefined) ??
        (info.shortName ? findBookByAlias(info.shortName) : undefined);
      if (matched) {
        this.cachedCanonicalToModuleBookNum.set(matched.bookNumber, moduleBookNum);
      }
    }
    return this.cachedCanonicalToModuleBookNum;
  }

  /**
   * Inspects the SQLite database to determine its module type, metadata, and LXX/MT versification tradition.
   */
  public getMetadata(id = this.id): ModuleMetadata {
    const normalizedId = id.toLowerCase();
    if (this.cachedMetadata?.has(normalizedId)) {
      return this.cachedMetadata.get(normalizedId)!;
    }

    const tables = this.getTableNames();
    let type: ModuleType = 'bible';
    if (tables.has('verses')) {
      type = 'bible';
    } else if (tables.has('commentaries')) {
      type = 'commentary';
    } else if (tables.has('dictionary')) {
      type = 'dictionary';
    } else if (this.filePath.toLowerCase().endsWith('.cmt.mybible')) {
      type = 'commentary';
    } else if (this.filePath.toLowerCase().endsWith('.dct.mybible')) {
      type = 'dictionary';
    }

    const infoMap = new Map<string, string>();
    if (tables.has('info')) {
      try {
        const rows = this.driver.all<{ name: string; value: string }>(
          'SELECT name, value FROM info',
        );
        for (const row of rows) {
          if (row.name != null && row.value != null) {
            infoMap.set(String(row.name).toLowerCase().trim(), String(row.value).trim());
          }
        }
      } catch {
        // Ignore malformed info table
      }
    }

    const language = infoMap.get('language');
    const description = infoMap.get('description') ?? infoMap.get('detailed_info');
    const rawStrong = infoMap.get('strong_numbers') ?? infoMap.get('is_strong');
    const isStrong =
      rawStrong !== undefined
        ? ['true', '1', 'yes'].includes(rawStrong.toLowerCase())
        : undefined;

    let tradition: VersificationTradition | undefined;
    if (type === 'bible') {
      tradition = this.detectTradition(normalizedId, tables, infoMap);
    }

    const metadata: ModuleMetadata = {
      id,
      filePath: this.filePath,
      type,
      ...(language !== undefined ? { language } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isStrong !== undefined ? { isStrong } : {}),
      ...(tradition !== undefined ? { tradition } : {}),
    };

    if (!this.cachedMetadata) {
      this.cachedMetadata = new Map();
    }
    this.cachedMetadata.set(normalizedId, metadata);
    return metadata;
  }

  private detectTradition(
    normalizedId: string,
    tables: Set<string>,
    infoMap: Map<string, string>,
  ): VersificationTradition {
    if (tables.has('verses')) {
      try {
        const canonicalMap = this.getCanonicalToModuleBookMap();
        const psalmsBookNum = canonicalMap.get(190) ?? 190;
        const row = this.driver.get<{ cnt: number }>(
          'SELECT COUNT(*) as cnt FROM verses WHERE book_number = ? AND chapter = 9',
          [psalmsBookNum],
        );
        const cnt = row ? Number(row.cnt) : 0;
        if (cnt >= 25) {
          return 'LXX';
        }
        if (cnt > 0 && cnt < 25) {
          return 'MT';
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback if Psalm 9 is not in module (e.g. NT-only module)
    const infoTradition =
      infoMap.get('versification') ?? infoMap.get('tradition') ?? '';
    if (infoTradition.toUpperCase() === 'LXX') {
      return 'LXX';
    }
    if (infoTradition.toUpperCase() === 'MT') {
      return 'MT';
    }

    const baseId = normalizedId.replace(/\+$/, '');
    if (KNOWN_LXX_MODULE_IDS.has(normalizedId) || KNOWN_LXX_MODULE_IDS.has(baseId)) {
      return 'LXX';
    }

    return 'MT';
  }

  public resolveEffectiveBookNumber(ref: ParsedReference): number {
    const tables = this.getTableNames();
    if (!tables.has('verses')) {
      return ref.bookNumber;
    }

    // 1. First check canonical mapping built from this module's `books` table
    const canonicalMap = this.getCanonicalToModuleBookMap();
    const mappedByTable = canonicalMap.get(ref.bookNumber);
    if (mappedByTable !== undefined) {
      return mappedByTable;
    }

    // 2. Check books table by short_name or long_name matching ref.bookName
    const booksMap = this.getBooksMap();
    if (ref.bookName && booksMap.size > 0) {
      const targetName = ref.bookName.toLowerCase().replace(/\.$/, '').trim();
      for (const [bookNum, info] of booksMap.entries()) {
        const sName = info.shortName?.toLowerCase().replace(/\.$/, '').trim();
        const lName = info.longName?.toLowerCase().replace(/\.$/, '').trim();
        if (sName === targetName || lName === targetName) {
          return bookNum;
        }
      }
    }

    // 3. Direct hit in verses table
    const directHit = this.driver.get<{ hit: number }>(
      'SELECT 1 as hit FROM verses WHERE book_number = ? LIMIT 1',
      [ref.bookNumber],
    );
    if (directHit) {
      return ref.bookNumber;
    }

    return ref.bookNumber;
  }

  /**
   * Queries verses from a Bible module matching `ParsedReference`.
   */
  public getVerses(
    ref: ParsedReference,
    options: CleanTextOptions = {},
    moduleId = this.id,
  ): BibleVerse[] {
    const tables = this.getTableNames();
    if (!tables.has('verses')) {
      throw new Error(`Database at ${this.filePath} does not contain a 'verses' table.`);
    }

    const effectiveBookNumber = this.resolveEffectiveBookNumber(ref);
    const metadata = this.getMetadata(moduleId);
    const booksMap = this.getBooksMap();
    const bookInfo = booksMap.get(effectiveBookNumber) ?? booksMap.get(ref.bookNumber);

    interface RawVerseRow {
      book_number: number;
      chapter: number;
      verse: number;
      text: string;
    }

    let rows: RawVerseRow[] = [];

    if (!ref.ranges || ref.ranges.length === 0) {
      rows = this.driver.all<RawVerseRow>(
        'SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse ASC',
        [effectiveBookNumber, ref.chapter],
      );
    } else {
      const seenVerses = new Set<number>();
      for (const range of ref.ranges) {
        const rangeRows = this.driver.all<RawVerseRow>(
          'SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse ASC',
          [effectiveBookNumber, ref.chapter, range.start, range.end],
        );
        for (const r of rangeRows) {
          const vNum = Number(r.verse);
          if (!seenVerses.has(vNum)) {
            seenVerses.add(vNum);
            rows.push(r);
          }
        }
      }
    }

    return rows.map((row) => {
      const rawText = row.text != null ? String(row.text) : '';
      return {
        bookNumber: ref.bookNumber,
        ...(bookInfo?.shortName ? { bookShortName: bookInfo.shortName } : {}),
        ...(bookInfo?.longName ? { bookLongName: bookInfo.longName } : {}),
        chapter: Number(row.chapter),
        verse: Number(row.verse),
        rawText,
        cleanText: cleanMyBibleText(rawText, options),
        translation: metadata.id,
        ...(metadata.tradition ? { tradition: metadata.tradition } : {}),
      };
    });
  }

  /**
   * Queries commentary entries from a `.cmt.mybible` module matching `ParsedReference`.
   */
  public getCommentaries(
    ref: ParsedReference,
    options: CleanTextOptions = {},
    moduleId = this.id,
  ): CommentaryEntry[] {
    const tables = this.getTableNames();
    if (!tables.has('commentaries')) {
      throw new Error(
        `Database at ${this.filePath} does not contain a 'commentaries' table.`,
      );
    }

    const metadata = this.getMetadata(moduleId);

    interface RawCommentaryRow {
      book_number: number;
      chapter_number_from: number;
      verse_number_from: number;
      chapter_number_to: number;
      verse_number_to: number;
      text: string;
    }

    const allChapterRows = this.driver.all<RawCommentaryRow>(
      `SELECT
        book_number,
        COALESCE(chapter_number_from, 0) AS chapter_number_from,
        COALESCE(verse_number_from, 0) AS verse_number_from,
        COALESCE(chapter_number_to, chapter_number_from, 0) AS chapter_number_to,
        COALESCE(verse_number_to, verse_number_from, 0) AS verse_number_to,
        text
      FROM commentaries
      WHERE book_number = ?
        AND COALESCE(chapter_number_from, 0) <= ?
        AND COALESCE(chapter_number_to, chapter_number_from, 0) >= ?
      ORDER BY chapter_number_from ASC, verse_number_from ASC`,
      [ref.bookNumber, ref.chapter, ref.chapter],
    );

    const filteredRows =
      !ref.ranges || ref.ranges.length === 0
        ? allChapterRows
        : allChapterRows.filter((row) => {
            const cFrom = Number(row.chapter_number_from);
            const vFrom = Number(row.verse_number_from);
            const cTo = Number(row.chapter_number_to) || cFrom;
            const vTo = Number(row.verse_number_to) || vFrom;

            const effectiveVFrom = cFrom < ref.chapter ? 1 : vFrom;
            const effectiveVTo = cTo > ref.chapter ? Number.MAX_SAFE_INTEGER : vTo;

            return ref.ranges!.some(
              (range) => effectiveVFrom <= range.end && effectiveVTo >= range.start,
            );
          });

    return filteredRows.map((row) => {
      const rawText = row.text != null ? String(row.text) : '';
      const cFrom = Number(row.chapter_number_from);
      const vFrom = Number(row.verse_number_from);
      const cTo = Number(row.chapter_number_to) || cFrom;
      const vTo = Number(row.verse_number_to) || vFrom;

      return {
        bookNumber: Number(row.book_number),
        chapterFrom: cFrom,
        verseFrom: vFrom,
        chapterTo: cTo,
        verseTo: vTo,
        rawText,
        cleanText: cleanMyBibleText(rawText, options),
        moduleId: metadata.id,
      };
    });
  }

  /**
   * Queries dictionary definitions from a `.dct.mybible` module by topic.
   */
  public getDictionaryDefinition(
    topic: string,
    options: CleanTextOptions = {},
    moduleId = this.id,
  ): DictionaryEntry[] {
    const tables = this.getTableNames();
    if (!tables.has('dictionary')) {
      throw new Error(
        `Database at ${this.filePath} does not contain a 'dictionary' table.`,
      );
    }

    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      return [];
    }

    const metadata = this.getMetadata(moduleId);

    interface RawDictionaryRow {
      topic: string;
      definition: string;
    }

    const searchTerms = [trimmedTopic];
    const strongMatch = trimmedTopic.match(/^([HGhg])0*(\d+)$/i);
    if (strongMatch) {
      const prefix = strongMatch[1].toUpperCase();
      const num = strongMatch[2];
      searchTerms.push(`${prefix}${num}`);
      searchTerms.push(`${prefix.toLowerCase()}${num}`);
    }

    // 1. Try exact case-insensitive match first
    const placeholders = searchTerms.map(() => '?').join(', ');
    let rows = this.driver.all<RawDictionaryRow>(
      `SELECT topic, definition FROM dictionary WHERE LOWER(topic) IN (${placeholders})`,
      searchTerms.map((t) => t.toLowerCase()),
    );

    // 2. Fallback to LIKE match if no exact hit
    if (rows.length === 0) {
      rows = this.driver.all<RawDictionaryRow>(
        'SELECT topic, definition FROM dictionary WHERE topic LIKE ? ORDER BY LENGTH(topic) ASC LIMIT 25',
        [`%${trimmedTopic}%`],
      );
    }

    return rows.map((row) => {
      const rawDefinition = row.definition != null ? String(row.definition) : '';
      return {
        topic: String(row.topic),
        rawDefinition,
        cleanDefinition: cleanMyBibleText(rawDefinition, options),
        moduleId: metadata.id,
      };
    });
  }

  /**
   * Returns all books present in this module with their chapter counts.
   */
  public getBooks(): ModuleBookSummary[] {
    const tables = this.getTableNames();
    if (!tables.has('verses')) {
      return [];
    }

    const rows = this.driver.all<{ book_number: number; chapter_count: number }>(
      'SELECT book_number, COUNT(DISTINCT chapter) as chapter_count FROM verses GROUP BY book_number ORDER BY book_number',
    );

    const booksMap = this.getBooksMap();
    const canonicalMap = this.getCanonicalToModuleBookMap();
    // Invert canonical map for reverse lookup
    const moduleToCanonical = new Map<number, number>();
    for (const [canonNum, modNum] of canonicalMap.entries()) {
      moduleToCanonical.set(modNum, canonNum);
    }

    return rows.map((row) => {
      const bNum = Number(row.book_number);
      const chCount = Number(row.chapter_count);
      const bookInfo = booksMap.get(bNum);

      let canonical = BOOK_LIST.find((b) => b.bookNumber === bNum);
      if (!canonical && moduleToCanonical.has(bNum)) {
        canonical = BOOK_LIST.find((b) => b.bookNumber === moduleToCanonical.get(bNum));
      }
      if (!canonical && bookInfo) {
        canonical =
          (bookInfo.longName ? findBookByAlias(bookInfo.longName) : undefined) ??
          (bookInfo.shortName ? findBookByAlias(bookInfo.shortName) : undefined);
      }

      const canonicalBookNumber = canonical?.bookNumber ?? bNum;
      const isNewTestament = canonicalBookNumber >= 470;
      const shortName =
        bookInfo?.shortName ??
        canonical?.shortNameUa ??
        canonical?.shortNameEn ??
        String(bNum);
      const longName =
        bookInfo?.longName ??
        canonical?.longNameUa ??
        canonical?.longNameEn ??
        shortName;

      return {
        bookNumber: bNum,
        canonicalBookNumber,
        shortName,
        longName,
        chapterCount: chCount,
        isNewTestament,
      };
    });
  }

  /**
   * Resolves chapters and verse counts for a book in this module.
   */
  public getChapters(bookNumber: number): ChapterSummary[] {
    const tables = this.getTableNames();
    if (!tables.has('verses')) {
      return [];
    }

    const effectiveBookNumber = this.resolveEffectiveBookNumber({
      bookNumber,
      chapter: 1,
      raw: String(bookNumber),
      bookName: '',
    });

    const rows = this.driver.all<{ chapter: number; verse_count: number }>(
      'SELECT chapter, COUNT(*) as verse_count FROM verses WHERE book_number = ? GROUP BY chapter ORDER BY chapter',
      [effectiveBookNumber],
    );

    return rows.map((r) => ({
      bookNumber,
      chapter: Number(r.chapter),
      verseCount: Number(r.verse_count),
    }));
  }

  /**
   * Full-text search across verses in this module, with tag cleaning and Cyrillic/Latin case-insensitivity.
   */
  public search(
    query: string,
    options: BibleSearchOptions = {},
  ): { totalMatches: number; verses: BibleVerse[] } {
    const tables = this.getTableNames();
    if (!tables.has('verses')) {
      return { totalMatches: 0, verses: [] };
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { totalMatches: 0, verses: [] };
    }

    const limit = options.limit ?? 50;
    const caseSensitive = Boolean(options.caseSensitive);
    const searchTarget = caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase();

    let sql = 'SELECT book_number, chapter, verse, text FROM verses';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.bookNumber !== undefined) {
      const effective = this.resolveEffectiveBookNumber({
        bookNumber: options.bookNumber,
        chapter: 1,
        raw: String(options.bookNumber),
        bookName: '',
      });
      conditions.push('book_number = ?');
      params.push(effective);
    } else if (options.testament === 'ot') {
      conditions.push('book_number < 470');
    } else if (options.testament === 'nt') {
      conditions.push('book_number >= 470');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY book_number ASC, chapter ASC, verse ASC';

    interface SearchRow {
      book_number: number;
      chapter: number;
      verse: number;
      text: string;
    }

    const rows = this.driver.all<SearchRow>(sql, params);
    const metadata = this.getMetadata(this.id);
    const booksMap = this.getBooksMap();

    let totalMatches = 0;
    const matchedVerses: BibleVerse[] = [];

    for (const row of rows) {
      const rawText = row.text != null ? String(row.text) : '';
      const cleanText = cleanMyBibleText(rawText);
      const testText = caseSensitive ? cleanText : cleanText.toLowerCase();

      if (testText.includes(searchTarget)) {
        totalMatches++;
        if (matchedVerses.length < limit) {
          const rowBookNum = Number(row.book_number);
          const bookInfo = booksMap.get(rowBookNum);
          matchedVerses.push({
            bookNumber: rowBookNum,
            ...(bookInfo?.shortName ? { bookShortName: bookInfo.shortName } : {}),
            ...(bookInfo?.longName ? { bookLongName: bookInfo.longName } : {}),
            chapter: Number(row.chapter),
            verse: Number(row.verse),
            rawText,
            cleanText,
            translation: metadata.id,
            ...(metadata.tradition ? { tradition: metadata.tradition } : {}),
          });
        }
      }
    }

    return { totalMatches, verses: matchedVerses };
  }

  public searchVerses(query: string, options: BibleSearchOptions = {}): BibleVerse[] {
    return this.search(query, options).verses;
  }

  public close(): void {
    this.driver.close();
  }
}

/**
 * Isomorphic core engine for MyBible operations.
 * Works across Node.js, Web Browsers, Web Workers, and Deno/Bun without any filesystem or Node built-in imports.
 */
export class MyBibleCoreEngine {
  constructor(public readonly provider: ModuleProvider) {}

  public resolveDefaultBibleModuleId(requestedTrans?: string): string {
    if (requestedTrans && requestedTrans.trim()) {
      return requestedTrans.trim();
    }
    const bibles = this.provider.listModules('bible');
    const preferred = ['ubt', 'ubio', 'ubio88', 'utt', 'npu', 'rst', 'kjv', 'esv'];
    for (const pref of preferred) {
      const hit = bibles.find((m) => m.id.toLowerCase() === pref);
      if (hit) {
        return hit.id;
      }
    }
    if (bibles.length > 0) {
      return bibles[0].id;
    }
    return 'ubt';
  }

  public getPassage(
    passage: string,
    options: GetPassageOptions = {},
  ): PassageQueryResult {
    const parsedRef = parseReference(passage);
    const transId = this.resolveDefaultBibleModuleId(options.trans);
    const { driver, metadata } = this.provider.openModule(transId, 'bible');
    const mod = new IsomorphicBibleModule(driver, metadata.id, metadata.filePath);

    try {
      const targetTradition: VersificationTradition = metadata.tradition ?? 'MT';
      const sourceTradition: VersificationTradition =
        options.sourceTradition ??
        parsedRef.inputTraditionHint ??
        targetTradition;

      let effectiveReference: ParsedReference[] = [parsedRef];
      let versificationInfo: PsalmConversionResult | undefined;

      if (parsedRef.bookNumber === 190) {
        if (!options.rawNumbers && sourceTradition !== targetTradition) {
          versificationInfo = convertPsalmReference(
            parsedRef,
            sourceTradition,
            targetTradition,
          );
          effectiveReference = versificationInfo.targetReferences;
        } else {
          versificationInfo =
            sourceTradition !== targetTradition
              ? convertPsalmReference(parsedRef, targetTradition, targetTradition)
              : describePsalmVersification(parsedRef, targetTradition);
          if (options.rawNumbers || sourceTradition === targetTradition) {
            versificationInfo = {
              ...versificationInfo,
              isChanged: false,
            };
          }
        }
      }

      const cleanOpts: CleanTextOptions = {
        keepStrongs: options.keepStrongs,
        keepNotes: options.keepNotes,
        markdownItalics: options.format === 'md',
      };

      const verses: BibleVerse[] = [];
      for (const effRef of effectiveReference) {
        const fetched = mod.getVerses(effRef, cleanOpts, metadata.id);
        for (const v of fetched) {
          if (
            parsedRef.bookNumber === 190 &&
            !options.rawNumbers &&
            sourceTradition !== targetTradition
          ) {
            const backMapped = mapSinglePsalmVerse(
              v.chapter,
              v.verse,
              targetTradition,
              sourceTradition,
            );
            v.mappedFrom = {
              tradition: sourceTradition,
              chapter: backMapped.chapter,
              verse: backMapped.verse,
            };
          }
          verses.push(v);
        }
      }

      return {
        query: passage,
        parsedReference: parsedRef,
        effectiveReference,
        module: metadata,
        verses,
        ...(versificationInfo ? { versificationInfo } : {}),
      };
    } finally {
      mod.close();
    }
  }

  public comparePassage(
    passage: string,
    options: ComparePassageOptions = {},
  ): PassageQueryResult[] {
    const parsedRef = parseReference(passage);

    let translations = options.translations?.filter((t) => t.trim()) ?? [];
    if (translations.length === 0) {
      const installedBibles = this.provider.listModules('bible');
      const preferredOrder = ['ubt', 'ubio', 'npu', 'rst', 'kjv', 'esv'];
      const ordered: string[] = [];
      for (const pref of preferredOrder) {
        if (installedBibles.some((m) => m.id.toLowerCase() === pref)) {
          ordered.push(pref);
        }
      }
      for (const m of installedBibles) {
        if (!ordered.includes(m.id.toLowerCase())) {
          ordered.push(m.id);
        }
      }
      translations = ordered.slice(0, 6);
    }

    if (translations.length === 0) {
      throw new Error(
        'No Bible modules found to compare. Run "mybible setup" to download default translations.',
      );
    }

    let sourceTradition: VersificationTradition | undefined =
      parsedRef.inputTraditionHint;
    if (!sourceTradition && translations.length > 0) {
      try {
        const firstMeta = this.provider.resolveModule(translations[0], 'bible');
        sourceTradition = firstMeta.tradition ?? 'LXX';
      } catch {
        sourceTradition = 'LXX';
      }
    }

    return translations.map((trans) =>
      this.getPassage(passage, {
        trans,
        format: options.format,
        info: options.info,
        keepStrongs: options.keepStrongs,
        keepNotes: options.keepNotes,
        rawNumbers: options.rawNumbers,
        sourceTradition,
      }),
    );
  }

  public getCommentaries(
    passage: string,
    options: { mod?: string; format?: OutputFormat; keepNotes?: boolean } = {},
  ): { reference: ParsedReference; module: ModuleMetadata; entries: CommentaryEntry[] } {
    const parsedRef = parseReference(passage);
    let modId = options.mod?.trim();
    if (!modId) {
      const cmts = this.provider.listModules('commentary');
      if (cmts.length === 0) {
        throw new Error(
          'No commentary modules (.cmt.mybible) installed. Run "mybible setup" to install sample commentary.',
        );
      }
      const preferred = [
        'ngsb',
        'calvin',
        'henry',
        'dauma',
        'mcarthur',
        'macdonald',
        'lopukhin',
        'spurgeon',
        'sample',
      ];
      const foundPref = preferred.find((p) =>
        cmts.some((m) => m.id.toLowerCase() === p),
      );
      modId = foundPref ?? cmts[0].id;
    }

    const { driver, metadata } = this.provider.openModule(modId, 'commentary');
    const mod = new IsomorphicBibleModule(driver, metadata.id, metadata.filePath);
    try {
      const cleanOpts = {
        keepNotes: options.keepNotes,
        markdownItalics: options.format === 'md',
      };

      // Psalms Versification Mapping (LXX <-> MT)
      if (parsedRef.bookNumber === 190) {
        const modTradition: VersificationTradition =
          metadata.tradition ?? (metadata.language === 'en' ? 'MT' : 'LXX');
        const inputTradition: VersificationTradition =
          parsedRef.inputTraditionHint ?? 'LXX';

        if (inputTradition !== modTradition) {
          const conversion = convertPsalmReference(
            parsedRef,
            inputTradition,
            modTradition,
          );
          const allEntries: CommentaryEntry[] = [];
          for (const targetRef of conversion.targetReferences) {
            const res = mod.getCommentaries(targetRef, cleanOpts, metadata.id);
            allEntries.push(...res);
          }
          if (allEntries.length > 0) {
            return { reference: parsedRef, module: metadata, entries: allEntries };
          }
        }
      }

      const entries = mod.getCommentaries(parsedRef, cleanOpts, metadata.id);
      return { reference: parsedRef, module: metadata, entries };
    } finally {
      mod.close();
    }
  }

  public getDictionary(
    topic: string,
    options: { mod?: string; format?: OutputFormat } = {},
  ): { query: string; module: ModuleMetadata; entries: DictionaryEntry[] } {
    const trimmedTopic = topic.trim();
    let modId = options.mod?.trim();
    if (!modId) {
      const dcts = this.provider.listModules('dictionary');
      if (dcts.length === 0) {
        throw new Error(
          'No dictionary modules (.dct.mybible) installed. Run "mybible setup" to install sample dictionary.',
        );
      }

      const isStrong = /^[HGhg]0*\d+$/i.test(trimmedTopic);
      if (isStrong && dcts.some((m) => m.id.toLowerCase() === 'strong')) {
        modId = 'strong';
      } else {
        const preferred = [
          'ngsb-dict',
          'elwell',
          'nbd',
          'brockhaus',
          'nikifor',
          'men',
          'strong',
          'sample',
        ];
        const foundPref = preferred.find((p) =>
          dcts.some((m) => m.id.toLowerCase() === p),
        );
        modId = foundPref ?? dcts[0].id;
      }
    }

    const { driver, metadata } = this.provider.openModule(modId, 'dictionary');
    const mod = new IsomorphicBibleModule(driver, metadata.id, metadata.filePath);
    try {
      const entries = mod.getDictionaryDefinition(
        trimmedTopic,
        { markdownItalics: options.format === 'md' },
        metadata.id,
      );
      return { query: topic, module: metadata, entries };
    } finally {
      mod.close();
    }
  }

  public getBooks(trans?: string): {
    module: ModuleMetadata;
    books: ModuleBookSummary[];
  } {
    const transId = this.resolveDefaultBibleModuleId(trans);
    const { driver, metadata } = this.provider.openModule(transId, 'bible');
    const mod = new IsomorphicBibleModule(driver, metadata.id, metadata.filePath);
    try {
      return { module: metadata, books: mod.getBooks() };
    } finally {
      mod.close();
    }
  }

  public getChapters(
    bookQuery: string | number,
    trans?: string,
  ): {
    module: ModuleMetadata;
    bookNumber: number;
    bookName: string;
    chapters: ChapterSummary[];
  } {
    const transId = this.resolveDefaultBibleModuleId(trans);
    const { driver, metadata } = this.provider.openModule(transId, 'bible');
    const mod = new IsomorphicBibleModule(driver, metadata.id, metadata.filePath);
    try {
      let bookNumber: number;
      let bookName: string;

      if (typeof bookQuery === 'number') {
        bookNumber = bookQuery;
        const b = getBookByNumber(bookNumber);
        bookName = b
          ? metadata.language === 'en'
            ? b.shortNameEn
            : b.shortNameUa
          : String(bookNumber);
      } else {
        const trimmed = String(bookQuery).trim();
        if (/^\d+$/.test(trimmed)) {
          bookNumber = Number.parseInt(trimmed, 10);
          const b = getBookByNumber(bookNumber);
          bookName = b
            ? metadata.language === 'en'
              ? b.shortNameEn
              : b.shortNameUa
            : trimmed;
        } else {
          const b = findBookByAlias(trimmed);
          if (b) {
            bookNumber = b.bookNumber;
            bookName = metadata.language === 'en' ? b.shortNameEn : b.shortNameUa;
          } else {
            const booksMap = mod.getBooksMap();
            let matchedNum: number | undefined;
            for (const [num, info] of booksMap.entries()) {
              if (
                info.shortName?.toLowerCase() === trimmed.toLowerCase() ||
                info.longName?.toLowerCase() === trimmed.toLowerCase()
              ) {
                matchedNum = num;
                bookName = info.shortName ?? trimmed;
                break;
              }
            }
            if (matchedNum !== undefined) {
              bookNumber = matchedNum;
              bookName = bookName! ?? trimmed;
            } else {
              bookNumber = 190;
              bookName = trimmed;
            }
          }
        }
      }

      const chapters = mod.getChapters(bookNumber);
      return {
        module: metadata,
        bookNumber,
        bookName,
        chapters,
      };
    } finally {
      mod.close();
    }
  }

  public search(query: string, options: BibleSearchOptions = {}): BibleSearchResult {
    const transId = this.resolveDefaultBibleModuleId(options.trans);
    const { driver, metadata } = this.provider.openModule(transId, 'bible');
    const mod = new IsomorphicBibleModule(driver, metadata.id, metadata.filePath);
    try {
      const { totalMatches, verses } = mod.search(query, options);
      return {
        query,
        module: metadata,
        totalMatches,
        verses,
      };
    } finally {
      mod.close();
    }
  }
}
