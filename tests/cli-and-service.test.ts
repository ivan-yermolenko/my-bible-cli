import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  compileBebliaXmlToSqlite,
  createSampleCommentaryAndDictionary,
  findCatalogModule,
  formatCommentaryEntries,
  formatComparisonResults,
  formatDictionaryEntries,
  formatPassageResult,
  MyBibleService,
  REMOTE_MODULES_CATALOG,
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
    const cmt = service.getCommentaries('Пс 22:1-3');
    assert.ok(cmt.entries.length >= 1);
    const cmtMd = formatCommentaryEntries(cmt.reference, cmt.entries, 'md');
    assert.match(cmtMd, /Господь — Пастир мій/);

    const dct = service.getDictionary('Благодать');
    assert.equal(dct.entries.length, 1);
    const dctMd = formatDictionaryEntries(dct.query, dct.entries, 'md');
    assert.match(dctMd, /незаслужена Божа прихильність/);
  });
});
