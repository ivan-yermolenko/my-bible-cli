import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import zlib from 'node:zlib';
import {
  type ModuleProvider,
  MyBibleCoreEngine,
  type SqlStorageDriver,
} from '../src/core/index.js';
import {
  compileBebliaXmlToSqlite,
  createSampleCommentaryAndDictionary,
  extractFirstFileFromZipBuffer,
  findCatalogModule,
  formatCommentaryEntries,
  formatComparisonResults,
  formatDictionaryEntries,
  formatPassageResult,
  MyBibleService,
  REMOTE_MODULES_CATALOG,
  startApiServer,
} from '../src/index.js';

describe('Remote Catalog, MyBibleService & Output Formatters', () => {
  let tmpDir: string;
  let service: MyBibleService;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mybible-cli-test-'));

    // Build mock LXX module (ubt) using compileBebliaXmlToSqlite
    // Book 19 = Psalms (book_number 190), Book 45 = Romans (book_number 590)
    // In LXX Psalm 9 has 39 verses (verses 1..21 = MT Ps 9, verses 22..39 = MT Ps 10)
    // and LXX Psalm 22 = MT Psalm 23 ("Господь — Пастир мій")
    const lxxPs9Verses = Array.from({ length: 39 }, (_, idx) => {
      const v = idx + 1;
      return `<verse number="${v}">УБТ Пс 9:${v} текст вірша</verse>`;
    }).join('\n');

    const ubtXml = `<?xml version="1.0" encoding="UTF-8"?>
<bible>
  <book number="19">
    <chapter number="9">
      ${lxxPs9Verses}
    </chapter>
    <chapter number="22">
      <verse number="1">Господь пасе мене, і нічого мені не бракуватиме.</verse>
      <verse number="2">На зелених пасовищах Він оселив мене.</verse>
      <verse number="3">Душу мою Він навернув.</verse>
    </chapter>
  </book>
  <book number="45">
    <chapter number="8">
      <verse number="28">Знаємо ж, що тим, які люблять Бога, усе сприяє до добра.</verse>
    </chapter>
  </book>
</bible>`;

    const ubtCatalogItem = findCatalogModule('ubt')!;
    compileBebliaXmlToSqlite(
      ubtXml,
      path.join(tmpDir, 'UBT.bbl.mybible'),
      ubtCatalogItem,
    );

    // Build mock MT module (kjv) using compileBebliaXmlToSqlite
    // In MT Psalm 9 has 20 verses, Psalm 10 has 18 verses, and Psalm 23 is "The LORD is my shepherd"
    const mtPs9Verses = Array.from({ length: 21 }, (_, idx) => {
      const v = idx + 1;
      return `<verse number="${v}">KJV Ps 9:${v} verse text</verse>`;
    }).join('\n');

    const mtPs10Verses = Array.from({ length: 18 }, (_, idx) => {
      const v = idx + 1;
      return `<verse number="${v}">KJV Ps 10:${v} verse text (LXX 9:${v + 21})</verse>`;
    }).join('\n');

    const kjvXml = `<?xml version="1.0" encoding="UTF-8"?>
<bible>
  <book number="19">
    <chapter number="9">
      ${mtPs9Verses}
    </chapter>
    <chapter number="10">
      ${mtPs10Verses}
    </chapter>
    <chapter number="23">
      <verse number="1">The LORD &amp; Savior is my shepherd; I shall not want.</verse>
      <verse number="2">He maketh me to lie down in green pastures.</verse>
      <verse number="3">He restoreth my soul.</verse>
    </chapter>
  </book>
  <book number="45">
    <chapter number="8">
      <verse number="28">And we know that all things work together for good to them that love God.</verse>
    </chapter>
  </book>
</bible>`;

    const kjvCatalogItem = findCatalogModule('kjv')!;
    compileBebliaXmlToSqlite(
      kjvXml,
      path.join(tmpDir, 'KJV.bbl.mybible'),
      kjvCatalogItem,
    );

    // Create sample commentary and dictionary
    createSampleCommentaryAndDictionary(tmpDir);

    service = new MyBibleService([tmpDir]);
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('REMOTE_MODULES_CATALOG contains 19 real Bible translations including Ukrainian, Russian, English, and Greek', () => {
    assert.ok(REMOTE_MODULES_CATALOG.length >= 19);
    assert.ok(findCatalogModule('ubt'));
    assert.ok(findCatalogModule('tub')); // alias for ubt
    assert.ok(findCatalogModule('ubio88'));
    assert.ok(findCatalogModule('esv'));
    assert.ok(findCatalogModule('kjv'));
    assert.ok(findCatalogModule('rst'));
    assert.ok(findCatalogModule('npu'));
  });

  it('MyBibleService.getPassage fetches Romans 8:28 in UBT and KJV', () => {
    const ubtRes = service.getPassage('Рим 8:28', { trans: 'ubt' });
    assert.equal(ubtRes.verses.length, 1);
    assert.equal(ubtRes.verses[0].chapter, 8);
    assert.equal(ubtRes.verses[0].verse, 28);
    assert.match(ubtRes.verses[0].cleanText, /люблять Бога/);

    const kjvRes = service.getPassage('Рим 8:28', { trans: 'kjv' });
    assert.equal(kjvRes.verses.length, 1);
    assert.match(kjvRes.verses[0].cleanText, /work together for good/);
  });

  it('MyBibleService.getPassage maps MT Ps 23:1-3 to LXX Пс 22:1-3 when querying UBT', () => {
    const res = service.getPassage('Ps 23:1-3', { trans: 'ubt' });
    assert.equal(res.module.tradition, 'LXX');
    assert.ok(res.versificationInfo?.isChanged);
    assert.equal(res.effectiveReference[0].chapter, 22);
    assert.equal(res.verses.length, 3);
    assert.match(res.verses[0].cleanText, /Господь пасе мене/);
    assert.deepEqual(res.verses[0].mappedFrom, {
      tradition: 'MT',
      chapter: 23,
      verse: 1,
    });
  });

  it('MyBibleService.comparePassage aligns LXX ubt and MT kjv on Пс 9:1-5, Пс 9:22-25, Пс 22:1-3, and Рим 8:28', () => {
    // 1. Пс 9:1-5 -> UBT (LXX 9:1-5) and KJV (MT 9:1-5)
    const cmp9a = service.comparePassage('Пс 9:1-5', {
      translations: ['ubt', 'kjv'],
    });
    assert.equal(cmp9a.length, 2);
    assert.equal(cmp9a[0].effectiveReference[0].chapter, 9);
    assert.equal(cmp9a[1].effectiveReference[0].chapter, 9);
    assert.equal(cmp9a[0].verses.length, 5);
    assert.equal(cmp9a[1].verses.length, 5);

    // 2. Пс 9:22-25 -> UBT (LXX 9:22-25) and KJV (MT 10:1-4!)
    const cmp9b = service.comparePassage('Пс 9:22-25', {
      translations: ['ubt', 'kjv'],
    });
    assert.equal(cmp9b[0].effectiveReference[0].chapter, 9);
    assert.equal(cmp9b[0].verses[0].verse, 22);
    assert.equal(cmp9b[1].effectiveReference[0].chapter, 10);
    assert.equal(cmp9b[1].verses[0].chapter, 10);
    assert.equal(cmp9b[1].verses[0].verse, 1);
    assert.equal(cmp9b[1].verses[3].verse, 4);
    assert.ok(cmp9b[1].versificationInfo?.isChanged);

    // 3. Пс 22:1-3 -> UBT (LXX 22:1-3) and KJV (MT 23:1-3!)
    const cmp22 = service.comparePassage('Пс 22:1-3', {
      translations: ['ubt', 'kjv'],
    });
    assert.equal(cmp22[0].effectiveReference[0].chapter, 22);
    assert.match(cmp22[0].verses[0].cleanText, /Господь пасе мене/);
    assert.equal(cmp22[1].effectiveReference[0].chapter, 23);
    assert.match(cmp22[1].verses[0].cleanText, /The LORD & Savior is my shepherd/);

    // 4. Рим 8:28 -> UBT (8:28) and KJV (8:28)
    const cmpRom = service.comparePassage('Рим 8:28', {
      translations: ['ubt', 'kjv'],
    });
    assert.equal(cmpRom[0].verses[0].verse, 28);
    assert.equal(cmpRom[1].verses[0].verse, 28);
  });

  it('Output formatters produce valid pretty, md, raw, and json outputs', () => {
    const kjvPs22 = service.getPassage('Пс 22:1-3', { trans: 'kjv', info: true });

    const prettyOut = formatPassageResult(kjvPs22, { format: 'pretty', info: true });
    assert.match(prettyOut, /Psalms 23:1-3/);
    assert.match(prettyOut, /LXX -> MT/);

    const mdOut = formatPassageResult(kjvPs22, { format: 'md', info: true });
    assert.match(mdOut, /^### Psalms 23:1-3 \(KJV — MT\)/m);
    assert.match(mdOut, /> \[!NOTE\]/);
    assert.match(mdOut, /> \*\*1\*\*/);

    const rawOut = formatPassageResult(kjvPs22, { format: 'raw' });
    assert.match(rawOut, /^1 The LORD & Savior is my shepherd/m);
    assert.doesNotMatch(rawOut, /###/);

    const jsonOut = formatPassageResult(kjvPs22, { format: 'json' });
    const parsedJson = JSON.parse(jsonOut);
    assert.equal(parsedJson.module.id, 'kjv');
    assert.equal(parsedJson.verses.length, 3);

    // Multi-translation comparison formatters
    const cmp = service.comparePassage('Пс 22:1-3', { translations: ['ubt', 'kjv'] });
    const cmpMd = formatComparisonResults(cmp, { format: 'md' });
    assert.match(cmpMd, /UBT — LXX/);
    assert.match(cmpMd, /KJV — MT/);

    const cmpInterleaved = formatComparisonResults(cmp, {
      format: 'md',
      verseByVerse: true,
    });
    assert.match(cmpInterleaved, /- \*\*UBT\/LXX\*\* \(22:1\)/);
    assert.match(cmpInterleaved, /- \*\*KJV\/MT\*\* \(23:1\)/);
  });

  it('Commentary and Dictionary queries and formatters work out of the box', () => {
    const cmt = service.getCommentaries('Пс 22:1-3', { mod: 'sample' });
    assert.ok(cmt.entries.length >= 1);
    const cmtMd = formatCommentaryEntries(cmt.reference, cmt.entries, 'md');
    assert.match(cmtMd, /Господь — Пастир мій/);

    const dct = service.getDictionary('Благодать', { mod: 'sample' });
    assert.equal(dct.entries.length, 1);
    const dctMd = formatDictionaryEntries(dct.query, dct.entries, 'md');
    assert.match(dctMd, /незаслужена Божа прихильність/);
  });

  it('Isomorphic core works purely with in-memory SqlStorageDriver and has zero Node FS dependencies', () => {
    class MockMemorySqlDriver implements SqlStorageDriver {
      private readonly verses = [
        { book_number: 190, chapter: 23, verse: 1, text: 'The Lord is my Shepherd.' },
        { book_number: 190, chapter: 23, verse: 2, text: 'He leads me beside still waters.' },
      ];

      all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
        if (sql.includes('sqlite_master')) {
          return [{ name: 'verses' }, { name: 'books' }, { name: 'info' }] as unknown as T[];
        }
        if (sql.includes('FROM info')) {
          return [{ name: 'language', value: 'en' }, { name: 'description', value: 'Mock Bible' }] as unknown as T[];
        }
        if (sql.includes('FROM books')) {
          return [{ book_number: 190, short_name: 'Ps', long_name: 'Psalms' }] as unknown as T[];
        }
        if (sql.includes('COUNT(DISTINCT chapter) as chapter_count')) {
          return [{ book_number: 190, chapter_count: 1 }] as unknown as T[];
        }
        if (sql.includes('COUNT(*) as verse_count')) {
          return [{ chapter: 23, verse_count: 2 }] as unknown as T[];
        }
        if (sql.includes('FROM verses')) {
          return this.verses as unknown as T[];
        }
        return [] as unknown as T[];
      }

      get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
        const rows = this.all<T>(sql, params);
        return rows[0];
      }

      close(): void {}
    }

    const mockProvider: ModuleProvider = {
      listModules() {
        return [{ id: 'mock', filePath: 'mock.bbl', type: 'bible', tradition: 'MT' }];
      },
      resolveModule(id) {
        return { id, filePath: `${id}.bbl`, type: 'bible', tradition: 'MT' };
      },
      openModule(id) {
        return {
          driver: new MockMemorySqlDriver(),
          metadata: { id, filePath: `${id}.bbl`, type: 'bible', tradition: 'MT' },
        };
      },
    };

    const coreEngine = new MyBibleCoreEngine(mockProvider);
    const passage = coreEngine.getPassage('Ps 23:1-2', { trans: 'mock' });
    assert.equal(passage.verses.length, 2);
    assert.equal(passage.verses[0].cleanText, 'The Lord is my Shepherd.');
    assert.equal(passage.verses[1].cleanText, 'He leads me beside still waters.');

    const books = coreEngine.getBooks('mock');
    assert.equal(books.books.length, 1);
    assert.equal(books.books[0].bookNumber, 190);
    assert.equal(books.books[0].chapterCount, 1);

    const chapters = coreEngine.getChapters(190, 'mock');
    assert.equal(chapters.chapters.length, 1);
    assert.equal(chapters.chapters[0].chapter, 23);
    assert.equal(chapters.chapters[0].verseCount, 2);
  });

  it('service.getBooks, service.getChapters, and service.search work accurately', () => {
    // 1. getBooks for 'ubt'
    const booksRes = service.getBooks('ubt');
    assert.equal(booksRes.module.id, 'ubt');
    assert.ok(booksRes.books.length >= 2);
    const psBook = booksRes.books.find((b) => b.bookNumber === 190);
    assert.ok(psBook);
    assert.equal(psBook.chapterCount, 2); // Chapters 9 & 22
    assert.equal(psBook.isNewTestament, false);

    const romBook = booksRes.books.find((b) => b.bookNumber === 590);
    assert.ok(romBook);
    assert.equal(romBook.isNewTestament, true);

    // 2. getChapters for 'Пс' in 'ubt'
    const chRes = service.getChapters('Пс', 'ubt');
    assert.equal(chRes.bookNumber, 190);
    assert.equal(chRes.chapters.length, 2);
    assert.equal(chRes.chapters[0].chapter, 9);
    assert.equal(chRes.chapters[0].verseCount, 39);
    assert.equal(chRes.chapters[1].chapter, 22);
    assert.equal(chRes.chapters[1].verseCount, 3);

    // 3. search for 'Господь' in 'ubt'
    const searchRes = service.search('Господь', { trans: 'ubt' });
    assert.equal(searchRes.module.id, 'ubt');
    assert.ok(searchRes.totalMatches >= 1);
    assert.ok(searchRes.verses.some((v) => v.cleanText.includes('Господь пасе мене')));
  });

  it('extractFirstFileFromZipBuffer accurately extracts deflated and stored files from ZIP buffer', () => {
    function createTestZip(fileName: string, contentStr: string, method: 0 | 8): Buffer {
      const content = Buffer.from(contentStr, 'utf8');
      const fnBuffer = Buffer.from(fileName, 'utf8');
      const compData = method === 8 ? zlib.deflateRawSync(content) : content;

      // Local Header
      const lfh = Buffer.alloc(30 + fnBuffer.length);
      lfh.writeUInt32LE(0x04034b50, 0);
      lfh.writeUInt16LE(20, 4);
      lfh.writeUInt16LE(0, 6);
      lfh.writeUInt16LE(method, 8);
      lfh.writeUInt32LE(compData.length, 18);
      lfh.writeUInt32LE(content.length, 22);
      lfh.writeUInt16LE(fnBuffer.length, 26);
      lfh.writeUInt16LE(0, 28);
      fnBuffer.copy(lfh, 30);

      const localOffset = 0;
      const centralOffset = lfh.length + compData.length;

      // Central Directory Entry
      const cd = Buffer.alloc(46 + fnBuffer.length);
      cd.writeUInt32LE(0x02014b50, 0);
      cd.writeUInt16LE(20, 4);
      cd.writeUInt16LE(20, 6);
      cd.writeUInt16LE(0, 8);
      cd.writeUInt16LE(method, 10);
      cd.writeUInt32LE(compData.length, 20);
      cd.writeUInt32LE(content.length, 24);
      cd.writeUInt16LE(fnBuffer.length, 28);
      cd.writeUInt16LE(0, 30);
      cd.writeUInt16LE(0, 32);
      cd.writeUInt32LE(localOffset, 42);
      fnBuffer.copy(cd, 46);

      // EOCD
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(1, 8);
      eocd.writeUInt16LE(1, 10);
      eocd.writeUInt32LE(cd.length, 12);
      eocd.writeUInt32LE(centralOffset, 16);

      return Buffer.concat([lfh, compData, cd, eocd]);
    }

    // Test Stored (0)
    const storedZip = createTestZip('StoredModule.SQLite3', 'Stored SQLite Data 123', 0);
    const extStored = extractFirstFileFromZipBuffer(storedZip);
    assert.equal(extStored.fileName, 'StoredModule.SQLite3');
    assert.equal(extStored.data.toString('utf8'), 'Stored SQLite Data 123');

    // Test Deflated (8)
    const deflatedZip = createTestZip('DeflatedModule.bbl.mybible', 'Deflated SQLite Compressed Data ABC', 8);
    const extDeflated = extractFirstFileFromZipBuffer(deflatedZip);
    assert.equal(extDeflated.fileName, 'DeflatedModule.bbl.mybible');
    assert.equal(extDeflated.data.toString('utf8'), 'Deflated SQLite Compressed Data ABC');
  });

  it('HTTP REST API server (startApiServer) responds accurately on an ephemeral port', async () => {
    const api = await startApiServer(service, { port: 0 });
    try {
      assert.ok(api.port > 0);
      assert.ok(api.url.startsWith('http://127.0.0.1:'));

      // 1. GET /api/health
      const healthRes = await fetch(`${api.url}/api/health`);
      assert.equal(healthRes.status, 200);
      const healthData = (await healthRes.json()) as { status: string };
      assert.equal(healthData.status, 'ok');

      // 2. GET /api/modules?type=bible
      const modRes = await fetch(`${api.url}/api/modules?type=bible`);
      assert.equal(modRes.status, 200);
      const modData = (await modRes.json()) as Array<{ id: string }>;
      assert.ok(modData.some((m) => m.id === 'ubt'));

      // 3. GET /api/books?trans=ubt
      const booksRes = await fetch(`${api.url}/api/books?trans=ubt`);
      assert.equal(booksRes.status, 200);
      const booksData = (await booksRes.json()) as { books: Array<{ bookNumber: number }> };
      assert.ok(booksData.books.length >= 2);

      // 4. GET /api/passage?q=Пс+22:1-3&trans=ubt
      const passRes = await fetch(`${api.url}/api/passage?q=Пс+22:1-3&trans=ubt`);
      assert.equal(passRes.status, 200);
      const passData = (await passRes.json()) as { verses: Array<{ cleanText: string }> };
      assert.equal(passData.verses.length, 3);
      assert.match(passData.verses[0].cleanText, /Господь пасе мене/);

      // 5. GET /api/compare?q=Пс+22:1-3&trans=ubt,kjv
      const cmpRes = await fetch(`${api.url}/api/compare?q=Пс+22:1-3&trans=ubt,kjv`);
      assert.equal(cmpRes.status, 200);
      const cmpData = (await cmpRes.json()) as unknown[];
      assert.equal(cmpData.length, 2);

      // 6. GET /api/search?q=Господь&trans=ubt
      const searchRes = await fetch(`${api.url}/api/search?q=Господь&trans=ubt`);
      assert.equal(searchRes.status, 200);
      const searchData = (await searchRes.json()) as { totalMatches: number; verses: unknown[] };
      assert.ok(searchData.totalMatches >= 1);
      assert.ok(searchData.verses.length >= 1);
    } finally {
      await api.close();
    }
  });

  it('provides an accurate missingBookHint when querying a book absent from a module', () => {
    const res = service.getPassage('Бут 1:1', { trans: 'ubt' });
    assert.equal(res.verses.length, 0);
    assert.ok(res.missingBookHint);
    assert.match(res.missingBookHint, /Книга «Буття» відсутня у модулі UBT/);

    const prettyOut = formatPassageResult(res, 'pretty');
    assert.match(prettyOut, /Книга «Буття» відсутня у модулі UBT/);

    const mdOut = formatPassageResult(res, 'md');
    assert.match(mdOut, /Книга «Буття» відсутня у модулі UBT/);
  });
});


