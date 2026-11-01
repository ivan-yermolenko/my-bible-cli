import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOK_LIST,
  findBookByAlias,
  getBookByNumber,
} from '../src/parser/book-names.js';
import { parseReference } from '../src/parser/reference-parser.js';

describe('Book Names Table & Lookup', () => {
  it('contains all 66 canonical books with unique bookNumber codes', () => {
    assert.equal(BOOK_LIST.length, 66);
    const numbers = new Set(BOOK_LIST.map((b) => b.bookNumber));
    assert.equal(numbers.size, 66);
  });

  it('finds books by Ukrainian, Russian, and English aliases', () => {
    assert.equal(findBookByAlias('Буття')?.bookNumber, 10);
    assert.equal(findBookByAlias('Бытие')?.bookNumber, 10);
    assert.equal(findBookByAlias('Genesis')?.bookNumber, 10);

    assert.equal(findBookByAlias('Пс')?.bookNumber, 190);
    assert.equal(findBookByAlias('Псалтирь')?.bookNumber, 190);
    assert.equal(findBookByAlias('Psalms')?.bookNumber, 190);

    assert.equal(findBookByAlias('1 Самуїлова')?.bookNumber, 90);
    assert.equal(findBookByAlias('1 Царств')?.bookNumber, 90);
    assert.equal(findBookByAlias('1 Царів')?.bookNumber, 110);
    assert.equal(findBookByAlias('3 Царств')?.bookNumber, 110);

    assert.equal(findBookByAlias('Ів')?.bookNumber, 500);
    assert.equal(findBookByAlias('Ин')?.bookNumber, 500);
    assert.equal(findBookByAlias('John')?.bookNumber, 500);

    assert.equal(findBookByAlias('1Кор')?.bookNumber, 600);
    assert.equal(findBookByAlias('1 Кор.')?.bookNumber, 600);
    assert.equal(findBookByAlias('Об')?.bookNumber, 730);
    assert.equal(findBookByAlias('Откр')?.bookNumber, 730);
    assert.equal(findBookByAlias('Rev')?.bookNumber, 730);
  });

  it('retrieves books by standard and alternate MyBible numbers', () => {
    assert.equal(getBookByNumber(10)?.canonicalCode, 'GEN');
    assert.equal(getBookByNumber(190)?.canonicalCode, 'PSA');
    assert.equal(getBookByNumber(470)?.canonicalCode, 'MAT');
    assert.equal(getBookByNumber(400)?.canonicalCode, 'MAT');
    assert.equal(getBookByNumber(730)?.canonicalCode, 'REV');
  });
});

describe('Smart Scripture Reference Parser', () => {
  it('parses Cyrillic Psalm references and sets inputTraditionHint to LXX', () => {
    const ref1 = parseReference('Пс 9:10-15');
    assert.equal(ref1.bookNumber, 190);
    assert.equal(ref1.chapter, 9);
    assert.deepEqual(ref1.ranges, [{ start: 10, end: 15 }]);
    assert.equal(ref1.inputTraditionHint, 'LXX');

    const ref2 = parseReference('Псалом 9:10');
    assert.equal(ref2.bookNumber, 190);
    assert.equal(ref2.chapter, 9);
    assert.deepEqual(ref2.ranges, [{ start: 10, end: 10 }]);
    assert.equal(ref2.inputTraditionHint, 'LXX');

    const ref3 = parseReference('Псалми 9:1-5,10');
    assert.equal(ref3.bookNumber, 190);
    assert.equal(ref3.chapter, 9);
    assert.deepEqual(ref3.ranges, [
      { start: 1, end: 5 },
      { start: 10, end: 10 },
    ]);
    assert.equal(ref3.inputTraditionHint, 'LXX');

    const ref4 = parseReference('Пс. 22');
    assert.equal(ref4.bookNumber, 190);
    assert.equal(ref4.chapter, 22);
    assert.equal(ref4.ranges, undefined);
    assert.equal(ref4.inputTraditionHint, 'LXX');
  });

  it('parses Latin Psalm references and sets inputTraditionHint to MT', () => {
    const ref1 = parseReference('Ps 9:1-10');
    assert.equal(ref1.bookNumber, 190);
    assert.equal(ref1.chapter, 9);
    assert.deepEqual(ref1.ranges, [{ start: 1, end: 10 }]);
    assert.equal(ref1.inputTraditionHint, 'MT');

    const ref2 = parseReference('Psalm 9:10-15');
    assert.equal(ref2.bookNumber, 190);
    assert.equal(ref2.chapter, 9);
    assert.deepEqual(ref2.ranges, [{ start: 10, end: 15 }]);
    assert.equal(ref2.inputTraditionHint, 'MT');

    const ref3 = parseReference('Psalms 23:1-6');
    assert.equal(ref3.bookNumber, 190);
    assert.equal(ref3.chapter, 23);
    assert.deepEqual(ref3.ranges, [{ start: 1, end: 6 }]);
    assert.equal(ref3.inputTraditionHint, 'MT');
  });

  it('parses NT and OT references with various dashes and spacing', () => {
    const rom = parseReference('Рим 8:28');
    assert.equal(rom.bookNumber, 590);
    assert.equal(rom.chapter, 8);
    assert.deepEqual(rom.ranges, [{ start: 28, end: 28 }]);

    const jhnRu = parseReference('Ин 3:16');
    assert.equal(jhnRu.bookNumber, 500);
    assert.equal(jhnRu.chapter, 3);
    assert.deepEqual(jhnRu.ranges, [{ start: 16, end: 16 }]);

    const jhnUa = parseReference('Ів 3:16');
    assert.equal(jhnUa.bookNumber, 500);
    assert.equal(jhnUa.chapter, 3);
    assert.deepEqual(jhnUa.ranges, [{ start: 16, end: 16 }]);

    const corCompact = parseReference('1Кор 13:4-8');
    assert.equal(corCompact.bookNumber, 600);
    assert.equal(corCompact.chapter, 13);
    assert.deepEqual(corCompact.ranges, [{ start: 4, end: 8 }]);

    const corEnDash = parseReference('1 Кор. 13:4–8');
    assert.equal(corEnDash.bookNumber, 600);
    assert.equal(corEnDash.chapter, 13);
    assert.deepEqual(corEnDash.ranges, [{ start: 4, end: 8 }]);

    const corEmDash = parseReference('1 Кор 13:4—8');
    assert.equal(corEmDash.bookNumber, 600);
    assert.equal(corEmDash.chapter, 13);
    assert.deepEqual(corEmDash.ranges, [{ start: 4, end: 8 }]);
  });

  it('throws helpful errors on invalid input', () => {
    assert.throws(() => parseReference(''), /Empty scripture reference/);
    assert.throws(() => parseReference('НевідомаКнига 1:1'), /Unknown Bible book/);
    assert.throws(() => parseReference('Пс 9:15-10'), /Invalid verse range/);
  });
});
