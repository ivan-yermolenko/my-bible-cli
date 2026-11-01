import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseReference } from '../src/parser/reference-parser.js';
import {
  convertPsalmReference,
  describePsalmVersification,
  mapSinglePsalmVerse,
} from '../src/versification/psalms-mapper.js';

describe('Psalms Versification Engine (LXX <-> MT)', () => {
  it('keeps Psalms 1–8 identical between LXX and MT', () => {
    for (let ch = 1; ch <= 8; ch++) {
      const m = mapSinglePsalmVerse(ch, 5, 'LXX', 'MT');
      assert.equal(m.chapter, ch);
      assert.equal(m.verse, 5);

      const rev = mapSinglePsalmVerse(ch, 5, 'MT', 'LXX');
      assert.equal(rev.chapter, ch);
      assert.equal(rev.verse, 5);
    }

    const ref = parseReference('Пс 1:1-6');
    const res = convertPsalmReference(ref, 'LXX', 'MT');
    assert.equal(res.isChanged, false);
    assert.equal(res.targetReferences.length, 1);
    assert.equal(res.targetReferences[0].chapter, 1);
    assert.deepEqual(res.targetReferences[0].ranges, [{ start: 1, end: 6 }]);
  });

  it('correctly maps LXX Psalm 9 <-> MT Psalms 9 & 10', () => {
    // Verses 1–21 -> MT Ps 9:1–21
    assert.deepEqual(
      {
        chapter: mapSinglePsalmVerse(9, 1, 'LXX', 'MT').chapter,
        verse: mapSinglePsalmVerse(9, 1, 'LXX', 'MT').verse,
      },
      { chapter: 9, verse: 1 }
    );
    assert.deepEqual(
      {
        chapter: mapSinglePsalmVerse(9, 21, 'LXX', 'MT').chapter,
        verse: mapSinglePsalmVerse(9, 21, 'LXX', 'MT').verse,
      },
      { chapter: 9, verse: 21 }
    );

    // Verses 22–39 -> MT Ps 10:1–18
    assert.deepEqual(
      {
        chapter: mapSinglePsalmVerse(9, 22, 'LXX', 'MT').chapter,
        verse: mapSinglePsalmVerse(9, 22, 'LXX', 'MT').verse,
      },
      { chapter: 10, verse: 1 }
    );
    assert.deepEqual(
      {
        chapter: mapSinglePsalmVerse(9, 39, 'LXX', 'MT').chapter,
        verse: mapSinglePsalmVerse(9, 39, 'LXX', 'MT').verse,
      },
      { chapter: 10, verse: 18 }
    );

    // Reverse: MT Ps 10:1–18 -> LXX Ps 9:22–39
    assert.deepEqual(
      {
        chapter: mapSinglePsalmVerse(10, 1, 'MT', 'LXX').chapter,
        verse: mapSinglePsalmVerse(10, 1, 'MT', 'LXX').verse,
      },
      { chapter: 9, verse: 22 }
    );
    assert.deepEqual(
      {
        chapter: mapSinglePsalmVerse(10, 18, 'MT', 'LXX').chapter,
        verse: mapSinglePsalmVerse(10, 18, 'MT', 'LXX').verse,
      },
      { chapter: 9, verse: 39 }
    );
  });

  it('splits LXX Psalm 9 ranges spanning across verse 21 into MT Ps 9 and MT Ps 10', () => {
    const spanRef = parseReference('Пс 9:18-25');
    const spanRes = convertPsalmReference(spanRef, 'LXX', 'MT');
    assert.equal(spanRes.isChanged, true);
    assert.equal(spanRes.targetReferences.length, 2);
    assert.equal(spanRes.targetReferences[0].chapter, 9);
    assert.deepEqual(spanRes.targetReferences[0].ranges, [{ start: 18, end: 21 }]);
    assert.equal(spanRes.targetReferences[1].chapter, 10);
    assert.deepEqual(spanRes.targetReferences[1].ranges, [{ start: 1, end: 4 }]);

    const wholeChap = parseReference('Пс 9');
    const wholeRes = convertPsalmReference(wholeChap, 'LXX', 'MT');
    assert.equal(wholeRes.isChanged, true);
    assert.equal(wholeRes.targetReferences.length, 2);
    assert.equal(wholeRes.targetReferences[0].chapter, 9);
    assert.deepEqual(wholeRes.targetReferences[0].ranges, [{ start: 1, end: 21 }]);
    assert.equal(wholeRes.targetReferences[1].chapter, 10);
    assert.deepEqual(wholeRes.targetReferences[1].ranges, [{ start: 1, end: 18 }]);
  });

  it('shifts LXX Psalms 10–112 <-> MT Psalms 11–113 by +1 / -1', () => {
    // Classic Shepherd Psalm: LXX Ps 22 <-> MT Ps 23
    const lxx22 = parseReference('Пс 22:1-6');
    const toMt = convertPsalmReference(lxx22, 'LXX', 'MT');
    assert.equal(toMt.isChanged, true);
    assert.equal(toMt.targetReferences.length, 1);
    assert.equal(toMt.targetReferences[0].chapter, 23);
    assert.deepEqual(toMt.targetReferences[0].ranges, [{ start: 1, end: 6 }]);

    const mt23 = parseReference('Ps 23:1-6');
    const toLxx = convertPsalmReference(mt23, 'MT', 'LXX');
    assert.equal(toLxx.isChanged, true);
    assert.equal(toLxx.targetReferences.length, 1);
    assert.equal(toLxx.targetReferences[0].chapter, 22);
    assert.deepEqual(toLxx.targetReferences[0].ranges, [{ start: 1, end: 6 }]);

    // Psalm 50 (LXX) <-> Psalm 51 (MT)
    const lxx50 = parseReference('Пс 50');
    const mt51 = convertPsalmReference(lxx50, 'LXX', 'MT');
    assert.equal(mt51.targetReferences[0].chapter, 51);
  });

  it('maps and splits LXX Psalm 113 <-> MT Psalms 114 & 115', () => {
    // LXX 113:1-8 -> MT 114:1-8
    const part1 = convertPsalmReference(parseReference('Пс 113:1-8'), 'LXX', 'MT');
    assert.equal(part1.targetReferences.length, 1);
    assert.equal(part1.targetReferences[0].chapter, 114);
    assert.deepEqual(part1.targetReferences[0].ranges, [{ start: 1, end: 8 }]);

    // LXX 113:9-26 -> MT 115:1-18
    const part2 = convertPsalmReference(parseReference('Пс 113:9-26'), 'LXX', 'MT');
    assert.equal(part2.targetReferences.length, 1);
    assert.equal(part2.targetReferences[0].chapter, 115);
    assert.deepEqual(part2.targetReferences[0].ranges, [{ start: 1, end: 18 }]);

    // Spanning across verse 8: Пс 113:6-12 -> MT 114:6-8 and MT 115:1-4
    const span = convertPsalmReference(parseReference('Пс 113:6-12'), 'LXX', 'MT');
    assert.equal(span.targetReferences.length, 2);
    assert.equal(span.targetReferences[0].chapter, 114);
    assert.deepEqual(span.targetReferences[0].ranges, [{ start: 6, end: 8 }]);
    assert.equal(span.targetReferences[1].chapter, 115);
    assert.deepEqual(span.targetReferences[1].ranges, [{ start: 1, end: 4 }]);

    // Reverse MT 115:1-18 -> LXX 113:9-26
    const rev = convertPsalmReference(parseReference('Ps 115:1-18'), 'MT', 'LXX');
    assert.equal(rev.targetReferences.length, 1);
    assert.equal(rev.targetReferences[0].chapter, 113);
    assert.deepEqual(rev.targetReferences[0].ranges, [{ start: 9, end: 26 }]);
  });

  it('maps and splits LXX Psalms 114 & 115 <-> MT Psalm 116', () => {
    // LXX 114:1-9 -> MT 116:1-9
    const lxx114 = convertPsalmReference(parseReference('Пс 114:1-9'), 'LXX', 'MT');
    assert.equal(lxx114.targetReferences[0].chapter, 116);
    assert.deepEqual(lxx114.targetReferences[0].ranges, [{ start: 1, end: 9 }]);

    // LXX 115:1-10 -> MT 116:10-19
    const lxx115 = convertPsalmReference(parseReference('Пс 115:1-10'), 'LXX', 'MT');
    assert.equal(lxx115.targetReferences[0].chapter, 116);
    assert.deepEqual(lxx115.targetReferences[0].ranges, [{ start: 10, end: 19 }]);

    // Reverse spanning across verse 9 in MT Ps 116:7-14 -> LXX 114:7-9 & LXX 115:1-5
    const mt116Span = convertPsalmReference(
      parseReference('Ps 116:7-14'),
      'MT',
      'LXX'
    );
    assert.equal(mt116Span.targetReferences.length, 2);
    assert.equal(mt116Span.targetReferences[0].chapter, 114);
    assert.deepEqual(mt116Span.targetReferences[0].ranges, [{ start: 7, end: 9 }]);
    assert.equal(mt116Span.targetReferences[1].chapter, 115);
    assert.deepEqual(mt116Span.targetReferences[1].ranges, [{ start: 1, end: 5 }]);

    // Whole MT Ps 116 -> LXX 114 & 115
    const mt116Whole = convertPsalmReference(parseReference('Ps 116'), 'MT', 'LXX');
    assert.equal(mt116Whole.targetReferences.length, 2);
    assert.equal(mt116Whole.targetReferences[0].chapter, 114);
    assert.equal(mt116Whole.targetReferences[1].chapter, 115);
  });

  it('shifts LXX Psalms 116–145 <-> MT Psalms 117–146 by +1 / -1', () => {
    // LXX Ps 118 <-> MT Ps 119
    const lxx118 = convertPsalmReference(
      parseReference('Пс 118:105'),
      'LXX',
      'MT'
    );
    assert.equal(lxx118.targetReferences[0].chapter, 119);
    assert.deepEqual(lxx118.targetReferences[0].ranges, [{ start: 105, end: 105 }]);

    const mt119 = convertPsalmReference(
      parseReference('Ps 119:105'),
      'MT',
      'LXX'
    );
    assert.equal(mt119.targetReferences[0].chapter, 118);
    assert.deepEqual(mt119.targetReferences[0].ranges, [{ start: 105, end: 105 }]);
  });

  it('maps and splits LXX Psalms 146 & 147 <-> MT Psalm 147', () => {
    // LXX 146:1-11 -> MT 147:1-11
    const lxx146 = convertPsalmReference(parseReference('Пс 146:1-11'), 'LXX', 'MT');
    assert.equal(lxx146.targetReferences[0].chapter, 147);
    assert.deepEqual(lxx146.targetReferences[0].ranges, [{ start: 1, end: 11 }]);

    // LXX 147:1-9 -> MT 147:12-20
    const lxx147 = convertPsalmReference(parseReference('Пс 147:1-9'), 'LXX', 'MT');
    assert.equal(lxx147.targetReferences[0].chapter, 147);
    assert.deepEqual(lxx147.targetReferences[0].ranges, [{ start: 12, end: 20 }]);

    // Reverse spanning across verse 11 in MT Ps 147:8-15 -> LXX 146:8-11 & LXX 147:1-4
    const mt147Span = convertPsalmReference(
      parseReference('Ps 147:8-15'),
      'MT',
      'LXX'
    );
    assert.equal(mt147Span.targetReferences.length, 2);
    assert.equal(mt147Span.targetReferences[0].chapter, 146);
    assert.deepEqual(mt147Span.targetReferences[0].ranges, [{ start: 8, end: 11 }]);
    assert.equal(mt147Span.targetReferences[1].chapter, 147);
    assert.deepEqual(mt147Span.targetReferences[1].ranges, [{ start: 1, end: 4 }]);
  });

  it('keeps Psalms 148–150 identical between LXX and MT', () => {
    for (let ch = 148; ch <= 150; ch++) {
      const m = mapSinglePsalmVerse(ch, 3, 'LXX', 'MT');
      assert.equal(m.chapter, ch);
      assert.equal(m.verse, 3);
    }

    const ref = parseReference('Пс 150:1-6');
    const res = convertPsalmReference(ref, 'LXX', 'MT');
    assert.equal(res.isChanged, false);
    assert.equal(res.targetReferences[0].chapter, 150);
  });

  it('describePsalmVersification auto-detects source tradition from inputTraditionHint', () => {
    const cyrRef = parseReference('Пс 22:1');
    const infoLxx = describePsalmVersification(cyrRef);
    assert.equal(infoLxx.sourceTradition, 'LXX');
    assert.equal(infoLxx.targetTradition, 'MT');
    assert.equal(infoLxx.targetReferences[0].chapter, 23);
    assert.ok(infoLxx.mappingNotes.length > 0);

    const latRef = parseReference('Ps 23:1');
    const infoMt = describePsalmVersification(latRef);
    assert.equal(infoMt.sourceTradition, 'MT');
    assert.equal(infoMt.targetTradition, 'LXX');
    assert.equal(infoMt.targetReferences[0].chapter, 22);
    assert.ok(infoMt.mappingNotes.length > 0);
  });
});
