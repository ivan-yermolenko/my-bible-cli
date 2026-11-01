import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, before, describe, it } from 'node:test';
import { ModuleRegistry, parseModuleFilename } from '../src/config/registry.js';
import { MyBibleDatabase } from '../src/db/sqlite-adapter.js';

describe('MyBibleDatabase and ModuleRegistry', () => {
  let tmpDir: string;
  let ubtPath: string;
  let kjvPath: string;
  let rstPlusPath: string;
  let cmtPath: string;
  let dctPath: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mybible-test-'));

    // 1. Create simulated LXX Bible module (UBT.bbl.mybible) with 38 verses in Psalm 9
    ubtPath = path.join(tmpDir, 'UBT.bbl.mybible');
    {
      const db = new DatabaseSync(ubtPath);
      db.exec(`
        CREATE TABLE info (name TEXT, value TEXT);
        INSERT INTO info (name, value) VALUES
          ('language', 'uk'),
          ('description', 'Український Біблійний Переклад'),
          ('strong_numbers', 'false');

        CREATE TABLE books (book_number INTEGER, short_name TEXT, long_name TEXT);
        INSERT INTO books VALUES (190, 'Пс.', 'Псалми');
        INSERT INTO books VALUES (43, 'Ів.', 'Від Івана');

        CREATE TABLE verses (book_number INTEGER, chapter INTEGER, verse INTEGER, text TEXT);
      `);
      const insertVerse = db.prepare(
        'INSERT INTO verses (book_number, chapter, verse, text) VALUES (?, ?, ?, ?)',
      );
      for (let v = 1; v <= 38; v++) {
        insertVerse.run(190, 9, v, `<pb/>Псалом 9 вірш ${v}<n>Прим. ${v}</n>`);
      }
      // Insert NT book with alternative book_number = 43 (short_name 'Ів.') to test fallback resolution
      insertVerse.run(43, 1, 1, 'Споконвіку було <J>Слово</J>.');
      db.close();
    }

    // 2. Create simulated MT Bible module (KJV.SQLite3) with 20 verses in Psalm 9
    kjvPath = path.join(tmpDir, 'KJV.SQLite3');
    {
      const db = new DatabaseSync(kjvPath);
      db.exec(`
        CREATE TABLE info (name TEXT, value TEXT);
        INSERT INTO info (name, value) VALUES
          ('language', 'en'),
          ('description', 'King James Version'),
          ('strong_numbers', 'true');

        CREATE TABLE books (book_number INTEGER, short_name TEXT, long_name TEXT);
        INSERT INTO books VALUES (190, 'Ps', 'Psalms');

        CREATE TABLE verses (book_number INTEGER, chapter INTEGER, verse INTEGER, text TEXT);
      `);
      const insertVerse = db.prepare(
        'INSERT INTO verses (book_number, chapter, verse, text) VALUES (?, ?, ?, ?)',
      );
      for (let v = 1; v <= 20; v++) {
        insertVerse.run(
          190,
          9,
          v,
          `I will praise<S>H3034</S> <i>thee</i>, O LORD (${v}).`,
        );
      }
      db.close();
    }

    // 3. Create RST+.SQLite3 (NT-only module to test fallback LXX detection and alias resolution)
    rstPlusPath = path.join(tmpDir, 'RST+.SQLite3');
    {
      const db = new DatabaseSync(rstPlusPath);
      db.exec(`
        CREATE TABLE info (name TEXT, value TEXT);
        INSERT INTO info (name, value) VALUES
          ('language', 'ru'),
          ('description', 'Русский Синодальный Перевод со Стронгами'),
          ('is_strong', '1');
        CREATE TABLE verses (book_number INTEGER, chapter INTEGER, verse INTEGER, text TEXT);
        INSERT INTO verses VALUES (500, 1, 1, 'В начале было Слово<S>3056</S>.');
      `);
      db.close();
    }

    // 4. Create simulated Commentary module (Barnes.cmt.mybible)
    cmtPath = path.join(tmpDir, 'Barnes.cmt.mybible');
    {
      const db = new DatabaseSync(cmtPath);
      db.exec(`
        CREATE TABLE info (name TEXT, value TEXT);
        INSERT INTO info (name, value) VALUES ('language', 'en'), ('description', 'Barnes Notes');
        CREATE TABLE commentaries (
          book_number INTEGER,
          chapter_number_from INTEGER,
          verse_number_from INTEGER,
          chapter_number_to INTEGER,
          verse_number_to INTEGER,
          text TEXT
        );
        INSERT INTO commentaries VALUES (190, 9, 1, 9, 2, '<h>Intro</h><pb/>Commentary on Psalm 9:1-2');
        INSERT INTO commentaries VALUES (190, 9, 15, 9, 16, 'Commentary on Psalm 9:15-16');
      `);
      db.close();
    }

    // 5. Create simulated Dictionary module (Strong.dct.mybible)
    dctPath = path.join(tmpDir, 'Strong.dct.mybible');
    {
      const db = new DatabaseSync(dctPath);
      db.exec(`
        CREATE TABLE info (name TEXT, value TEXT);
        INSERT INTO info (name, value) VALUES ('language', 'en'), ('description', 'Strong Dictionary');
        CREATE TABLE dictionary (topic TEXT, definition TEXT);
        INSERT INTO dictionary VALUES ('G3056', '<b>Logos</b><br/>A word, speech, divine expression.');
        INSERT INTO dictionary VALUES ('H3034', 'Yadah: to give thanks, laud, praise.');
      `);
      db.close();
    }
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('auto-detects LXX vs MT tradition and reads metadata accurately', () => {
    const ubtDb = new MyBibleDatabase(ubtPath);
    const ubtMeta = ubtDb.getMetadata('ubt');
    assert.strictEqual(ubtMeta.type, 'bible');
    assert.strictEqual(ubtMeta.tradition, 'LXX');
    assert.strictEqual(ubtMeta.language, 'uk');
    assert.strictEqual(ubtMeta.isStrong, false);
    ubtDb.close();

    const kjvDb = new MyBibleDatabase(kjvPath);
    const kjvMeta = kjvDb.getMetadata('kjv');
    assert.strictEqual(kjvMeta.type, 'bible');
    assert.strictEqual(kjvMeta.tradition, 'MT');
    assert.strictEqual(kjvMeta.language, 'en');
    assert.strictEqual(kjvMeta.isStrong, true);
    kjvDb.close();
  });

  it('queries whole chapter and specific verse ranges with tag cleaning options', () => {
    const kjvDb = new MyBibleDatabase(kjvPath);
    const allVerses = kjvDb.getVerses(
      { raw: 'Ps 9', bookNumber: 190, bookName: 'Ps', chapter: 9 },
      {},
      'kjv',
    );
    assert.strictEqual(allVerses.length, 20);
    assert.strictEqual(allVerses[0].bookShortName, 'Ps');
    assert.strictEqual(allVerses[0].cleanText, 'I will praise thee, O LORD (1).');

    const rangeVerses = kjvDb.getVerses(
      {
        raw: 'Ps 9:2-4',
        bookNumber: 190,
        bookName: 'Ps',
        chapter: 9,
        ranges: [{ start: 2, end: 4 }],
      },
      { keepStrongs: true, markdownItalics: true },
      'kjv',
    );
    assert.strictEqual(rangeVerses.length, 3);
    assert.strictEqual(
      rangeVerses[0].cleanText,
      'I will praise [H3034] *thee*, O LORD (2).',
    );
    kjvDb.close();
  });

  it('supports fallback book_number resolution via books table short_name', () => {
    const ubtDb = new MyBibleDatabase(ubtPath);
    const verses = ubtDb.getVerses(
      {
        raw: 'Ів. 1:1',
        bookNumber: 500, // Standard MyBible John is 500, but UBT test DB stored it under 43 with short_name 'Ів.'
        bookName: 'Ів.',
        chapter: 1,
        ranges: [{ start: 1, end: 1 }],
      },
      {},
      'ubt',
    );
    assert.strictEqual(verses.length, 1);
    assert.strictEqual(verses[0].cleanText, 'Споконвіку було Слово.');
    ubtDb.close();
  });

  it('queries commentaries and dictionary entries', () => {
    const cmtDb = new MyBibleDatabase(cmtPath);
    const entries = cmtDb.getCommentaries(
      {
        raw: 'Ps 9:1',
        bookNumber: 190,
        bookName: 'Ps',
        chapter: 9,
        ranges: [{ start: 1, end: 1 }],
      },
      {},
      'barnes',
    );
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].cleanText, 'Commentary on Psalm 9:1-2');
    cmtDb.close();

    const dctDb = new MyBibleDatabase(dctPath);
    const exact = dctDb.getDictionaryDefinition('g3056', {}, 'strong');
    assert.strictEqual(exact.length, 1);
    assert.strictEqual(
      exact[0].cleanDefinition,
      'Logos A word, speech, divine expression.',
    );

    const like = dctDb.getDictionaryDefinition('3034', {}, 'strong');
    assert.strictEqual(like.length, 1);
    assert.strictEqual(like[0].topic, 'H3034');
    dctDb.close();
  });

  it('normalizes filenames and resolves modules via ModuleRegistry', () => {
    assert.deepStrictEqual(parseModuleFilename('RST+.SQLite3'), {
      id: 'rst+',
      aliases: ['rst+', 'rst'],
      defaultType: 'bible',
    });

    const registry = new ModuleRegistry([tmpDir]);
    const allModules = registry.listModules().filter((m) => m.filePath.startsWith(tmpDir));
    assert.strictEqual(allModules.length, 5);

    const bibles = registry.listModules('bible').filter((m) => m.filePath.startsWith(tmpDir));
    assert.strictEqual(bibles.length, 3);

    // Resolve 'rst' via alias for 'RST+.SQLite3'
    const rstMeta = registry.resolveModule('rst', 'bible');
    assert.strictEqual(rstMeta.id, 'rst+');
    assert.strictEqual(rstMeta.tradition, 'LXX');
    assert.strictEqual(rstMeta.isStrong, true);

    // Open database via registry
    const { db, metadata } = registry.openDatabase('Barnes', 'commentary');
    assert.strictEqual(metadata.id, 'barnes');
    assert.strictEqual(metadata.type, 'commentary');
    db.close();
  });
});
