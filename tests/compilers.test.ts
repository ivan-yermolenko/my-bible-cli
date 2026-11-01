import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import zlib from 'node:zlib';
import {
  compileBibleQuoteDictToSqlite,
  compileBibleQuoteToSqlite,
  compileSpurgeonTodToSqlite,
  compileStrongsJsonToSqlite,
  compileTskCrossrefsToSqlite,
  extractAllFilesFromZipBuffer,
  extractFirstFileFromZipBuffer,
  findCatalogModule,
  MyBibleService,
  REMOTE_MODULES_CATALOG,
} from '../src/index.js';

describe('Multi-Source Module Compilers & Downloader Engine', () => {
  let tmpDir: string;
  let service: MyBibleService;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mybible-compilers-test-'));
    service = new MyBibleService([tmpDir]);
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('extractAllFilesFromZipBuffer accurately extracts multiple files with deflate and stored entries', () => {
    const file1Name = 'folder/test1.txt';
    const file1Data = Buffer.from('Hello from test1 deflated content!');
    const file1Comp = zlib.deflateRawSync(file1Data);

    const file2Name = 'folder/test2.txt';
    const file2Data = Buffer.from('Hello from test2 uncompressed stored content!');

    // Build mock ZIP in memory
    const localHdr1 = Buffer.alloc(30 + file1Name.length);
    localHdr1.writeUInt32LE(0x04034b50, 0);
    localHdr1.writeUInt16LE(20, 4); // version
    localHdr1.writeUInt16LE(0, 6); // flags
    localHdr1.writeUInt16LE(8, 8); // method = 8 (deflate)
    localHdr1.writeUInt32LE(0, 14); // crc
    localHdr1.writeUInt32LE(file1Comp.length, 18);
    localHdr1.writeUInt32LE(file1Data.length, 22);
    localHdr1.writeUInt16LE(file1Name.length, 26);
    localHdr1.writeUInt16LE(0, 28);
    localHdr1.write(file1Name, 30, 'utf8');

    const localHdr2 = Buffer.alloc(30 + file2Name.length);
    localHdr2.writeUInt32LE(0x04034b50, 0);
    localHdr2.writeUInt16LE(20, 4);
    localHdr2.writeUInt16LE(0, 6);
    localHdr2.writeUInt16LE(0, 8); // method = 0 (stored)
    localHdr2.writeUInt32LE(0, 14);
    localHdr2.writeUInt32LE(file2Data.length, 18);
    localHdr2.writeUInt32LE(file2Data.length, 22);
    localHdr2.writeUInt16LE(file2Name.length, 26);
    localHdr2.writeUInt16LE(0, 28);
    localHdr2.write(file2Name, 30, 'utf8');

    const offset1 = 0;
    const offset2 = localHdr1.length + file1Comp.length;

    // Central Directory
    const cd1 = Buffer.alloc(46 + file1Name.length);
    cd1.writeUInt32LE(0x02014b50, 0);
    cd1.writeUInt16LE(20, 4);
    cd1.writeUInt16LE(20, 6);
    cd1.writeUInt16LE(0, 8);
    cd1.writeUInt16LE(8, 10);
    cd1.writeUInt32LE(0, 16);
    cd1.writeUInt32LE(file1Comp.length, 20);
    cd1.writeUInt32LE(file1Data.length, 24);
    cd1.writeUInt16LE(file1Name.length, 28);
    cd1.writeUInt32LE(offset1, 42);
    cd1.write(file1Name, 46, 'utf8');

    const cd2 = Buffer.alloc(46 + file2Name.length);
    cd2.writeUInt32LE(0x02014b50, 0);
    cd2.writeUInt16LE(20, 4);
    cd2.writeUInt16LE(20, 6);
    cd2.writeUInt16LE(0, 8);
    cd2.writeUInt16LE(0, 10);
    cd2.writeUInt32LE(0, 16);
    cd2.writeUInt32LE(file2Data.length, 20);
    cd2.writeUInt32LE(file2Data.length, 24);
    cd2.writeUInt16LE(file2Name.length, 28);
    cd2.writeUInt32LE(offset2, 42);
    cd2.write(file2Name, 46, 'utf8');

    const cdOffset = offset2 + localHdr2.length + file2Data.length;
    const cdSize = cd1.length + cd2.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(2, 8); // total entries on disk
    eocd.writeUInt16LE(2, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdOffset, 16);

    const zipBuffer = Buffer.concat([
      localHdr1,
      file1Comp,
      localHdr2,
      file2Data,
      cd1,
      cd2,
      eocd,
    ]);

    const extracted = extractAllFilesFromZipBuffer(zipBuffer);
    assert.equal(extracted.size, 2);
    assert.equal(extracted.get(file1Name)?.toString('utf8'), file1Data.toString('utf8'));
    assert.equal(extracted.get(file2Name)?.toString('utf8'), file2Data.toString('utf8'));

    const first = extractFirstFileFromZipBuffer(zipBuffer);
    assert.ok(first.fileName.includes('test'));
  });

  it('compileBibleQuoteToSqlite compiles a BibleQuote commentary with chapter and verse ranges', () => {
    const iniContent = `
BibleName = Calvin Romans Commentary
ChapterSign = <h4>
VerseSign = <p>
PathName = 52.htm
FullName = К Римлянам
ShortName = Рим. Ro.
`;
    const romHtml = `
<h4>Глава 8</h4>
<p><b>1-4. Введение в главу 8.</b> Здесь апостол рассуждает об оправдании.
<p><b>28. Притом знаем, что любящим Бога все содействует ко благу. 29. Ибо кого Он предузнал... 30. А кого...</b>
<p>Это замечательное место Писания о суверенном Божьем избрании и вечном замысле спасения.
`;

    const files = new Map<string, Buffer>();
    files.set('bibleqt.ini', Buffer.from(iniContent, 'utf8'));
    files.set('52.htm', Buffer.from(romHtml, 'utf8'));

    const calvinCatalog = findCatalogModule('calvin')!;
    const destPath = path.join(tmpDir, 'CALVIN.cmt.mybible');
    const stats = compileBibleQuoteToSqlite(files, destPath, calvinCatalog);

    assert.ok(stats.entriesInserted >= 2);
    assert.ok(fs.existsSync(destPath));

    const res = service.getCommentaries('Рим 8:28', { mod: 'calvin' });
    assert.ok(res.entries.length >= 1);
    const entry28 = res.entries.find((e) => e.verseFrom <= 28 && e.verseTo >= 28);
    assert.ok(entry28);
    assert.equal(entry28.verseFrom, 28);
    assert.equal(entry28.verseTo, 30);
    assert.ok(entry28.cleanText.includes('Притом знаем'));
  });

  it('compileBibleQuoteToSqlite compiles a BibleQuote Bible module with books and verses', () => {
    const iniContent = `
BibleName = Новий Заповіт
ChapterSign = <h4>
VerseSign = <p>
PathName = mat.htm
FullName = От Матфея
ShortName = Мф. Мт.
`;
    const matHtml = `
<h4>От Матфея 1</h4>
<p>1 Родовід Ісуса Христа, Сина Давидового, Сина Авраамового.</p>
<p>2 Авраам породив Ісаака, а Ісаак породив Якова.</p>
`;
    const files = new Map<string, Buffer>();
    files.set('bibleqt.ini', Buffer.from(iniContent, 'utf8'));
    files.set('mat.htm', Buffer.from(matHtml, 'utf8'));

    const destPath = path.join(tmpDir, 'KASSIAN.bbl.mybible');
    const kassianCatalog = findCatalogModule('kassian')!;
    const stats = compileBibleQuoteToSqlite(files, destPath, kassianCatalog);

    assert.equal(stats.booksInserted, 1);
    assert.equal(stats.entriesInserted, 2);

    const res = service.getPassage('Мт 1:1-2', { trans: 'kassian' });
    assert.equal(res.verses.length, 2);
    assert.equal(res.verses[0].verse, 1);
    assert.ok(res.verses[0].cleanText.includes('Родовід Ісуса Христа'));
  });

  it('compileBibleQuoteDictToSqlite compiles dictionary from .idx and .htm files', () => {
    // UTF-8 .idx with topic and byte offsets
    const topic1 = 'Благодать';
    const topic2 = 'Завіт';
    const def1 = '<h4>Благодать</h4><p>Незаслужена милість Господня до грішників.</p>';
    const def2 = '<h4>Завіт</h4><p>Священний союз між Богом та Його обраним народом.</p>';

    const htmBuffer = Buffer.from(def1 + def2, 'utf8');
    const offset1 = 0;
    const offset2 = Buffer.byteLength(def1, 'utf8');

    const idxText = `${topic1}\n${offset1}\n${topic2}\n${offset2}\n`;
    const idxBuffer = Buffer.from(idxText, 'utf8');

    const files = new Map<string, Buffer>();
    files.set('DICT.idx', idxBuffer);
    files.set('DICT.htm', htmBuffer);

    const destPath = path.join(tmpDir, 'NGSB-DICT.dct.mybible');
    const ngsbDictCatalog = findCatalogModule('ngsb-dict')!;
    const stats = compileBibleQuoteDictToSqlite(files, destPath, ngsbDictCatalog);

    assert.equal(stats.entriesInserted, 2);

    const graceRes = service.getDictionary('Благодать', { mod: 'ngsb-dict' });
    assert.equal(graceRes.entries.length, 1);
    assert.equal(graceRes.entries[0].topic, 'Благодать');
    assert.ok(graceRes.entries[0].cleanDefinition.includes('Незаслужена милість'));

    const covRes = service.getDictionary('Завіт', { mod: 'ngsb-dict' });
    assert.equal(covRes.entries.length, 1);
    assert.ok(covRes.entries[0].cleanDefinition.includes('Священний союз'));
  });

  it('compileStrongsJsonToSqlite compiles Greek and Hebrew Lexicon into STRONG.dct.mybible with smart search', () => {
    const greekJs = `
      var strongsGreek = {
        "G25": {
          "lemma": "ἀγαπάω",
          "translit": "agapáō",
          "strongs_def": "to love (in a social or moral sense)",
          "kjv_def": "(be-)love(-ed)"
        },
        "G3056": {
          "lemma": "λόγος",
          "translit": "lógos",
          "strongs_def": "something said (including the thought); by implication, a topic, reason, motive",
          "kjv_def": "word, saying"
        }
      };
    `;

    const hebrewJs = `
      var strongsHebrew = {
        "H430": {
          "lemma": "אֱלֹהִים",
          "xlit": "ʼĕlôhîym",
          "pron": "el-o-heem",
          "strongs_def": "gods in the ordinary sense; but specifically used of the supreme God",
          "kjv_def": "God, judges, mighty"
        }
      };
    `;

    const destPath = path.join(tmpDir, 'STRONG.dct.mybible');
    const strongCatalog = findCatalogModule('strong')!;
    const stats = compileStrongsJsonToSqlite(greekJs, hebrewJs, destPath, strongCatalog);

    assert.ok(stats.entriesInserted >= 3);

    // 1. Exact query
    const g25Res = service.getDictionary('G25');
    assert.ok(g25Res.entries.length >= 1);
    assert.ok(g25Res.entries[0].cleanDefinition.includes('ἀγαπάω'));
    assert.ok(g25Res.entries[0].cleanDefinition.includes('agapáō'));

    // 2. Lowercase query without specifying module (smart detection!)
    const g25Lower = service.getDictionary('g25');
    assert.ok(g25Lower.entries.length >= 1);
    assert.ok(g25Lower.entries[0].cleanDefinition.includes('ἀγαπάω'));

    // 3. Zero-padded query (G0025 -> G25)
    const g25Padded = service.getDictionary('G0025');
    assert.ok(g25Padded.entries.length >= 1);
    assert.ok(g25Padded.entries[0].cleanDefinition.includes('ἀγαπάω'));

    // 4. Hebrew query
    const h430Res = service.getDictionary('H430');
    assert.ok(h430Res.entries.length >= 1);
    assert.ok(h430Res.entries[0].cleanDefinition.includes('אֱלֹהִים'));
  });

  it('compileSpurgeonTodToSqlite compiles Psalms markdown and correctly cross-maps LXX Пс 22 to MT Ps 23', () => {
    const ps23Md = `---
title: "Psalm 23 | The Treasury of David"
---

# Psalm 23

Title &mdash; A Psalm of David.

## Exposition

### Verse 1
The LORD is my shepherd; I shall not want. The sweetest sentence in all human speech.

### Verses 2 & 3
He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul.
`;

    // Create zip buffer containing psalm-23.md
    const fn = 'chspurgeon-tod-main/volume-1/psalm-23.md';
    const data = Buffer.from(ps23Md, 'utf8');

    const lHdr = Buffer.alloc(30 + fn.length);
    lHdr.writeUInt32LE(0x04034b50, 0);
    lHdr.writeUInt16LE(20, 4);
    lHdr.writeUInt16LE(0, 6);
    lHdr.writeUInt16LE(0, 8);
    lHdr.writeUInt32LE(data.length, 18);
    lHdr.writeUInt32LE(data.length, 22);
    lHdr.writeUInt16LE(fn.length, 26);
    lHdr.write(fn, 30, 'utf8');

    const cd = Buffer.alloc(46 + fn.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(fn.length, 28);
    cd.writeUInt32LE(0, 42);
    cd.write(fn, 46, 'utf8');

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(lHdr.length + data.length, 16);

    const zipBuf = Buffer.concat([lHdr, data, cd, eocd]);

    const destPath = path.join(tmpDir, 'SPURGEON-EN.cmt.mybible');
    const spurgeonCatalog = findCatalogModule('spurgeon-en')!;
    const stats = compileSpurgeonTodToSqlite(zipBuf, destPath, spurgeonCatalog);

    assert.ok(stats.entriesInserted >= 2);

    // 1. Direct MT query
    const mtRes = service.getCommentaries('Ps 23:1', { mod: 'spurgeon-en' });
    assert.ok(mtRes.entries.length >= 1);
    assert.ok(mtRes.entries[0].cleanText.includes('The sweetest sentence'));

    // 2. Cross-tradition LXX query: Cyrillic "Пс 22:1" maps automatically to MT Ps 23:1!
    const lxxRes = service.getCommentaries('Пс 22:1', { mod: 'spurgeon-en' });
    assert.ok(lxxRes.entries.length >= 1);
    assert.ok(lxxRes.entries[0].cleanText.includes('The sweetest sentence'));
  });

  it('compileTskCrossrefsToSqlite compiles Scripture cross-references into TSK.cmt.mybible', () => {
    // Book 45 = Romans (590), Chapter 8, Verse 28
    const tsvData = `
45\t8\t28\t1\tlove\t1jo 4:19;ro 8:30
45\t8\t28\t2\tgood\tps 84:11;jer 29:11;2co 4:17
`;
    const destPath = path.join(tmpDir, 'TSK.cmt.mybible');
    const tskCatalog = findCatalogModule('tsk')!;
    const stats = compileTskCrossrefsToSqlite(tsvData, destPath, tskCatalog);

    assert.equal(stats.entriesInserted, 1); // 1 combined entry for Romans 8:28

    const res = service.getCommentaries('Рим 8:28', { mod: 'tsk' });
    assert.equal(res.entries.length, 1);
    assert.ok(res.entries[0].cleanText.includes('1jo 4:19'));
    assert.ok(res.entries[0].cleanText.includes('ps 84:11'));
  });

  it('REMOTE_MODULES_CATALOG contains comprehensive catalog of 48 Bible, Commentary, and Dictionary modules', () => {
    assert.ok(REMOTE_MODULES_CATALOG.length >= 40);

    const bibles = REMOTE_MODULES_CATALOG.filter((m) => m.type === 'bible');
    const commentaries = REMOTE_MODULES_CATALOG.filter((m) => m.type === 'commentary');
    const dicts = REMOTE_MODULES_CATALOG.filter((m) => m.type === 'dictionary');

    assert.ok(bibles.length >= 25);
    assert.ok(commentaries.length >= 10);
    assert.ok(dicts.length >= 6);

    // Verify key new modules exist in catalog
    assert.ok(findCatalogModule('uk1903'));
    assert.ok(findCatalogModule('lcvu'));
    assert.ok(findCatalogModule('igrb'));
    assert.ok(findCatalogModule('ibs'));
    assert.ok(findCatalogModule('rbo'));
    assert.ok(findCatalogModule('kassian'));
    assert.ok(findCatalogModule('rst-strong'));
    assert.ok(findCatalogModule('ucs'));
    assert.ok(findCatalogModule('wlc'));

    assert.ok(findCatalogModule('ngsb'));
    assert.ok(findCatalogModule('calvin'));
    assert.ok(findCatalogModule('henry'));
    assert.ok(findCatalogModule('dauma'));
    assert.ok(findCatalogModule('mcarthur'));
    assert.ok(findCatalogModule('macdonald'));
    assert.ok(findCatalogModule('lopukhin'));
    assert.ok(findCatalogModule('barclay'));
    assert.ok(findCatalogModule('spurgeon'));
    assert.ok(findCatalogModule('nrt-notes'));
    assert.ok(findCatalogModule('hertz'));
    assert.ok(findCatalogModule('tsk'));

    assert.ok(findCatalogModule('strong'));
    assert.ok(findCatalogModule('ngsb-dict'));
    assert.ok(findCatalogModule('elwell'));
    assert.ok(findCatalogModule('nbd'));
    assert.ok(findCatalogModule('brockhaus'));
    assert.ok(findCatalogModule('nikifor'));
    assert.ok(findCatalogModule('men'));
  });
});
