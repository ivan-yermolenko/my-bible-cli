import { DatabaseSync } from 'node:sqlite';
import { findBookByAlias } from '../parser/book-names.js';
import type {
  BibleVerse,
  CleanTextOptions,
  CommentaryEntry,
  DictionaryEntry,
  ModuleMetadata,
  ModuleType,
  ParsedReference,
  VersificationTradition,
} from '../types.js';
import { cleanMyBibleText } from '../utils/text-cleaner.js';

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

/**
 * Standard MyBible book_number for NT (470..730) vs legacy/alternative numbering (40..66 or 400..660).
 * Also helps resolve book info from the `books` table.
 */
interface BookRow {
  book_number: number;
  short_name?: string;
  long_name?: string;
}

export class MyBibleDatabase {
  private readonly db: DatabaseSync;
  public readonly filePath: string;
  private cachedTables?: Set<string>;
  private cachedMetadata?: Map<string, ModuleMetadata>;
  private cachedBooks?: Map<number, { shortName?: string; longName?: string }>;
  private cachedCanonicalToModuleBookNum?: Map<number, number>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.db = new DatabaseSync(filePath, { readOnly: true });
  }

  private getTableNames(): Set<string> {
    if (this.cachedTables) {
      return this.cachedTables;
    }
    const stmt = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'view')",
    );
    const rows = stmt.all() as Array<{ name: string }>;
    this.cachedTables = new Set(rows.map((r) => r.name.toLowerCase()));
    return this.cachedTables;
  }

  private getBooksMap(): Map<number, { shortName?: string; longName?: string }> {
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
      const stmt = this.db.prepare(
        `SELECT book_number, short_name, long_name FROM ${booksTable}`,
      );
      const rows = stmt.all() as unknown as BookRow[];
      for (const row of rows) {
        this.cachedBooks.set(Number(row.book_number), {
          shortName: row.short_name ? String(row.short_name).trim() : undefined,
          longName: row.long_name ? String(row.long_name).trim() : undefined,
        });
      }
    } catch {
      // Ignore if schema of books table differs slightly
    }

    return this.cachedBooks;
  }

  private getCanonicalToModuleBookMap(): Map<number, number> {
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
   * Inspects the SQLite database to determine its module type, info metadata, and LXX/MT versification tradition.
   */
  public getMetadata(id: string): ModuleMetadata {
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
        const stmt = this.db.prepare('SELECT name, value FROM info');
        const rows = stmt.all() as Array<{ name: string; value: string }>;
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
        const stmt = this.db.prepare(
          'SELECT COUNT(*) as cnt FROM verses WHERE book_number = ? AND chapter = 9',
        );
        const row = stmt.get(psalmsBookNum) as { cnt: number } | undefined;
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

  /**
   * Resolves the effective `book_number` in this database for a requested reference.
   * Handles both 10..390 and 230-style MyBible numbering via `books` table lookup.
   */
  private resolveEffectiveBookNumber(ref: ParsedReference): number {
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
    const checkStmt = this.db.prepare(
      'SELECT 1 FROM verses WHERE book_number = ? LIMIT 1',
    );
    const directHit = checkStmt.get(ref.bookNumber);
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
    moduleId = 'bible',
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
      const stmt = this.db.prepare(
        'SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse ASC',
      );
      rows = stmt.all(effectiveBookNumber, ref.chapter) as unknown as RawVerseRow[];
    } else {
      const stmt = this.db.prepare(
        'SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse ASC',
      );
      const seenVerses = new Set<number>();
      for (const range of ref.ranges) {
        const rangeRows = stmt.all(
          effectiveBookNumber,
          ref.chapter,
          range.start,
          range.end,
        ) as unknown as RawVerseRow[];
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
    moduleId = 'commentary',
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

    // Select all entries that touch this book and chapter
    const stmt = this.db.prepare(`
      SELECT
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
      ORDER BY chapter_number_from ASC, verse_number_from ASC
    `);

    const allChapterRows = stmt.all(
      ref.bookNumber,
      ref.chapter,
      ref.chapter,
    ) as unknown as RawCommentaryRow[];

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
   * Queries dictionary definitions from a `.dct.mybible` module by topic (exact match first, then LIKE search).
   */
  public getDictionaryDefinition(
    topic: string,
    options: CleanTextOptions = {},
    moduleId = 'dictionary',
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

    // 1. Try exact case-insensitive match first
    const exactStmt = this.db.prepare(
      'SELECT topic, definition FROM dictionary WHERE LOWER(topic) = LOWER(?)',
    );
    let rows = exactStmt.all(trimmedTopic) as unknown as RawDictionaryRow[];

    // 2. Fallback to LIKE match if no exact hit
    if (rows.length === 0) {
      const likeStmt = this.db.prepare(
        'SELECT topic, definition FROM dictionary WHERE topic LIKE ? ORDER BY LENGTH(topic) ASC LIMIT 25',
      );
      rows = likeStmt.all(`%${trimmedTopic}%`) as unknown as RawDictionaryRow[];
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

  public close(): void {
    this.db.close();
  }
}
