import type {
  ParsedReference,
  PsalmConversionResult,
  PsalmMappingSegment,
  VerseRange,
  VersificationTradition,
} from '../types.js';
import { formatParsedReference } from '../parser/reference-parser.js';

const PSALMS_BOOK_NUMBER = 190;

/**
 * Maps a single Psalm verse between LXX (Septuagint / Synodal / Ohiienko)
 * and MT (Masoretic / Hebrew / English KJV/ESV) versification traditions.
 */
export function mapSinglePsalmVerse(
  chapter: number,
  verse: number,
  sourceTradition: VersificationTradition,
  targetTradition: VersificationTradition
): { chapter: number; verse: number; note: string } {
  if (chapter < 1 || chapter > 151) {
    throw new Error(`Invalid Psalm chapter: ${chapter}`);
  }
  if (verse < 1) {
    throw new Error(`Invalid Psalm verse: ${verse}`);
  }

  if (sourceTradition === targetTradition) {
    return {
      chapter,
      verse,
      note: `${sourceTradition} Ps ${chapter}:${verse} = ${targetTradition} Ps ${chapter}:${verse} (без змін / identical)`,
    };
  }

  if (sourceTradition === 'LXX' && targetTradition === 'MT') {
    return mapSingleLxxToMt(chapter, verse);
  } else {
    return mapSingleMtToLxx(chapter, verse);
  }
}

function mapSingleLxxToMt(
  lxxChapter: number,
  lxxVerse: number
): { chapter: number; verse: number; note: string } {
  // Psalms 1–8: identical
  if (lxxChapter >= 1 && lxxChapter <= 8) {
    return {
      chapter: lxxChapter,
      verse: lxxVerse,
      note: `Пс ${lxxChapter} (LXX) та Ps ${lxxChapter} (MT) мають однакову нумерацію розділів (Psalms 1–8 identical).`,
    };
  }

  // LXX Psalm 9 -> MT Psalms 9 & 10
  if (lxxChapter === 9) {
    if (lxxVerse <= 21) {
      return {
        chapter: 9,
        verse: lxxVerse,
        note: `LXX Пс 9:${lxxVerse} відповідає MT Ps 9:${lxxVerse} (вірші 1–21 збігаються 1:1 / LXX Ps 9 combines MT Ps 9 & 10).`,
      };
    } else {
      const mtVerse = lxxVerse - 21;
      return {
        chapter: 10,
        verse: mtVerse,
        note: `LXX Пс 9:${lxxVerse} відповідає MT Ps 10:${mtVerse} (у LXX Пс 9 об'єднує MT Ps 9 і 10; зсув вірша -21 після 9:21).`,
      };
    }
  }

  // LXX Psalms 10–112 -> MT Psalms 11–113 (+1 chapter)
  if (lxxChapter >= 10 && lxxChapter <= 112) {
    const mtChapter = lxxChapter + 1;
    return {
      chapter: mtChapter,
      verse: lxxVerse,
      note: `LXX Пс ${lxxChapter}:${lxxVerse} -> MT Ps ${mtChapter}:${lxxVerse} (зсув нумерації псалмів +1 у MT через об'єднання Пс 9–10 у LXX).`,
    };
  }

  // LXX Psalm 113 -> MT Psalms 114 & 115
  if (lxxChapter === 113) {
    if (lxxVerse <= 8) {
      return {
        chapter: 114,
        verse: lxxVerse,
        note: `LXX Пс 113:${lxxVerse} -> MT Ps 114:${lxxVerse} (LXX Пс 113:1–8 відповідає MT Ps 114:1–8).`,
      };
    } else {
      const mtVerse = lxxVerse - 8;
      return {
        chapter: 115,
        verse: mtVerse,
        note: `LXX Пс 113:${lxxVerse} -> MT Ps 115:${mtVerse} (LXX Пс 113:9–26 відповідає MT Ps 115:1–18; зсув вірша -8).`,
      };
    }
  }

  // LXX Psalm 114 -> MT Psalm 116:1-9
  if (lxxChapter === 114) {
    return {
      chapter: 116,
      verse: lxxVerse,
      note: `LXX Пс 114:${lxxVerse} -> MT Ps 116:${lxxVerse} (LXX Пс 114:1–9 становить першу частину MT Ps 116:1–9).`,
    };
  }

  // LXX Psalm 115 -> MT Psalm 116:10-19 (+9 verses)
  if (lxxChapter === 115) {
    const mtVerse = lxxVerse + 9;
    return {
      chapter: 116,
      verse: mtVerse,
      note: `LXX Пс 115:${lxxVerse} -> MT Ps 116:${mtVerse} (LXX Пс 115:1–10 становить другу частину MT Ps 116:10–19; зсув вірша +9).`,
    };
  }

  // LXX Psalms 116–145 -> MT Psalms 117–146 (+1 chapter)
  if (lxxChapter >= 116 && lxxChapter <= 145) {
    const mtChapter = lxxChapter + 1;
    return {
      chapter: mtChapter,
      verse: lxxVerse,
      note: `LXX Пс ${lxxChapter}:${lxxVerse} -> MT Ps ${mtChapter}:${lxxVerse} (зсув нумерації псалмів +1 у MT).`,
    };
  }

  // LXX Psalm 146 -> MT Psalm 147:1-11
  if (lxxChapter === 146) {
    return {
      chapter: 147,
      verse: lxxVerse,
      note: `LXX Пс 146:${lxxVerse} -> MT Ps 147:${lxxVerse} (LXX Пс 146:1–11 становить першу частину MT Ps 147:1–11).`,
    };
  }

  // LXX Psalm 147 -> MT Psalm 147:12-20 (+11 verses)
  if (lxxChapter === 147) {
    const mtVerse = lxxVerse + 11;
    return {
      chapter: 147,
      verse: mtVerse,
      note: `LXX Пс 147:${lxxVerse} -> MT Ps 147:${mtVerse} (LXX Пс 147:1–9 становить другу частину MT Ps 147:12–20; зсув вірша +11).`,
    };
  }

  // Psalms 148–150 (and 151): identical chapter numbers
  return {
    chapter: lxxChapter,
    verse: lxxVerse,
    note: `Пс ${lxxChapter} (LXX) та Ps ${lxxChapter} (MT) мають однакову нумерацію розділів (Psalms 148–150 identical).`,
  };
}

function mapSingleMtToLxx(
  mtChapter: number,
  mtVerse: number
): { chapter: number; verse: number; note: string } {
  // Psalms 1–8: identical
  if (mtChapter >= 1 && mtChapter <= 8) {
    return {
      chapter: mtChapter,
      verse: mtVerse,
      note: `MT Ps ${mtChapter} та LXX Пс ${mtChapter} мають однакову нумерацію розділів (Psalms 1–8 identical).`,
    };
  }

  // MT Psalm 9 -> LXX Psalm 9:1-21
  if (mtChapter === 9) {
    return {
      chapter: 9,
      verse: mtVerse,
      note: `MT Ps 9:${mtVerse} -> LXX Пс 9:${mtVerse} (MT Ps 9:1–21 відповідає першій частині LXX Пс 9:1–21).`,
    };
  }

  // MT Psalm 10 -> LXX Psalm 9:22-39 (+21 verses)
  if (mtChapter === 10) {
    const lxxVerse = mtVerse + 21;
    return {
      chapter: 9,
      verse: lxxVerse,
      note: `MT Ps 10:${mtVerse} -> LXX Пс 9:${lxxVerse} (MT Ps 10:1–18 входить до складу LXX Пс 9:22–39; зсув вірша +21).`,
    };
  }

  // MT Psalms 11–113 -> LXX Psalms 10–112 (-1 chapter)
  if (mtChapter >= 11 && mtChapter <= 113) {
    const lxxChapter = mtChapter - 1;
    return {
      chapter: lxxChapter,
      verse: mtVerse,
      note: `MT Ps ${mtChapter}:${mtVerse} -> LXX Пс ${lxxChapter}:${mtVerse} (зсув нумерації псалмів -1 у LXX).`,
    };
  }

  // MT Psalm 114 -> LXX Psalm 113:1-8
  if (mtChapter === 114) {
    return {
      chapter: 113,
      verse: mtVerse,
      note: `MT Ps 114:${mtVerse} -> LXX Пс 113:${mtVerse} (MT Ps 114:1–8 відповідає першій частині LXX Пс 113:1–8).`,
    };
  }

  // MT Psalm 115 -> LXX Psalm 113:9-26 (+8 verses)
  if (mtChapter === 115) {
    const lxxVerse = mtVerse + 8;
    return {
      chapter: 113,
      verse: lxxVerse,
      note: `MT Ps 115:${mtVerse} -> LXX Пс 113:${lxxVerse} (MT Ps 115:1–18 відповідає другій частині LXX Пс 113:9–26; зсув вірша +8).`,
    };
  }

  // MT Psalm 116 -> LXX Psalms 114 & 115
  if (mtChapter === 116) {
    if (mtVerse <= 9) {
      return {
        chapter: 114,
        verse: mtVerse,
        note: `MT Ps 116:${mtVerse} -> LXX Пс 114:${mtVerse} (MT Ps 116:1–9 відповідає LXX Пс 114:1–9).`,
      };
    } else {
      const lxxVerse = mtVerse - 9;
      return {
        chapter: 115,
        verse: lxxVerse,
        note: `MT Ps 116:${mtVerse} -> LXX Пс 115:${lxxVerse} (MT Ps 116:10–19 відповідає LXX Пс 115:1–10; зсув вірша -9).`,
      };
    }
  }

  // MT Psalms 117–146 -> LXX Psalms 116–145 (-1 chapter)
  if (mtChapter >= 117 && mtChapter <= 146) {
    const lxxChapter = mtChapter - 1;
    return {
      chapter: lxxChapter,
      verse: mtVerse,
      note: `MT Ps ${mtChapter}:${mtVerse} -> LXX Пс ${lxxChapter}:${mtVerse} (зсув нумерації псалмів -1 у LXX).`,
    };
  }

  // MT Psalm 147 -> LXX Psalms 146 & 147
  if (mtChapter === 147) {
    if (mtVerse <= 11) {
      return {
        chapter: 146,
        verse: mtVerse,
        note: `MT Ps 147:${mtVerse} -> LXX Пс 146:${mtVerse} (MT Ps 147:1–11 відповідає LXX Пс 146:1–11).`,
      };
    } else {
      const lxxVerse = mtVerse - 11;
      return {
        chapter: 147,
        verse: lxxVerse,
        note: `MT Ps 147:${mtVerse} -> LXX Пс 147:${lxxVerse} (MT Ps 147:12–20 відповідає LXX Пс 147:1–9; зсув вірша -11).`,
      };
    }
  }

  // Psalms 148–150: identical
  return {
    chapter: mtChapter,
    verse: mtVerse,
    note: `MT Ps ${mtChapter} та LXX Пс ${mtChapter} мають однакову нумерацію розділів (Psalms 148–150 identical).`,
  };
}

/**
 * Converts a parsed Psalm reference (whole chapter or verse ranges)
 * from `sourceTradition` to `targetTradition`, splitting across chapters when needed.
 */
export function convertPsalmReference(
  ref: ParsedReference,
  sourceTradition: VersificationTradition,
  targetTradition: VersificationTradition
): PsalmConversionResult {
  // Non-Psalms or same tradition: return unchanged
  if (ref.bookNumber !== PSALMS_BOOK_NUMBER || sourceTradition === targetTradition) {
    const segments: PsalmMappingSegment[] = [];
    if (ref.ranges && ref.ranges.length > 0) {
      for (const r of ref.ranges) {
        segments.push({
          sourceTradition,
          targetTradition,
          sourceChapter: ref.chapter,
          sourceVerseStart: r.start,
          sourceVerseEnd: r.end,
          targetChapter: ref.chapter,
          targetVerseStart: r.start,
          targetVerseEnd: r.end,
          note:
            ref.bookNumber === PSALMS_BOOK_NUMBER
              ? `Традиція ${sourceTradition} збігається з цільовою (${targetTradition}); перерахунок не потрібен.`
              : 'Книга поза Псалтирем; нумерація не змінюється.',
        });
      }
    } else {
      segments.push({
        sourceTradition,
        targetTradition,
        sourceChapter: ref.chapter,
        targetChapter: ref.chapter,
        note:
          ref.bookNumber === PSALMS_BOOK_NUMBER
            ? `Традиція ${sourceTradition} збігається з цільовою (${targetTradition}); перерахунок не потрібен.`
            : 'Книга поза Псалтирем; нумерація не змінюється.',
      });
    }

    return {
      originalReference: ref,
      sourceTradition,
      targetTradition,
      isChanged: false,
      targetReferences: [{ ...ref }],
      mappingNotes: segments.map((s) => s.note),
      segments,
    };
  }

  const segments: PsalmMappingSegment[] = [];

  if (!ref.ranges || ref.ranges.length === 0) {
    // Whole chapter conversion
    segments.push(
      ...mapWholePsalmChapter(ref.chapter, sourceTradition, targetTradition)
    );
  } else {
    // Verse ranges conversion
    for (const range of ref.ranges) {
      segments.push(
        ...mapPsalmVerseRange(
          ref.chapter,
          range,
          sourceTradition,
          targetTradition
        )
      );
    }
  }

  // Group segments by targetChapter into targetReferences
  const targetReferences = buildTargetReferences(
    ref,
    segments,
    targetTradition
  );

  const isChanged = segments.some(
    (s) =>
      s.sourceChapter !== s.targetChapter ||
      s.sourceVerseStart !== s.targetVerseStart ||
      s.sourceVerseEnd !== s.targetVerseEnd
  );

  const mappingNotes = Array.from(new Set(segments.map((s) => s.note)));

  return {
    originalReference: ref,
    sourceTradition,
    targetTradition,
    isChanged,
    targetReferences,
    mappingNotes,
    segments,
  };
}

function mapWholePsalmChapter(
  chapter: number,
  sourceTradition: VersificationTradition,
  targetTradition: VersificationTradition
): PsalmMappingSegment[] {
  if (sourceTradition === 'LXX' && targetTradition === 'MT') {
    if (chapter >= 1 && chapter <= 8) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: chapter,
          targetChapter: chapter,
          note: `LXX Пс ${chapter} = MT Ps ${chapter} (Псалми 1–8 мають однакову нумерацію / identical chapter numbers).`,
        },
      ];
    }
    if (chapter === 9) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 9,
          sourceVerseStart: 1,
          sourceVerseEnd: 21,
          targetChapter: 9,
          targetVerseStart: 1,
          targetVerseEnd: 21,
          note: 'LXX Пс 9:1–21 -> MT Ps 9:1–21 (перша частина Пс 9 за Септуагінтою).',
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 9,
          sourceVerseStart: 22,
          sourceVerseEnd: 39,
          targetChapter: 10,
          targetVerseStart: 1,
          targetVerseEnd: 18,
          note: 'LXX Пс 9:22–39 -> MT Ps 10:1–18 (друга частина Пс 9 за Септуагінтою виокремлена в MT Ps 10; зсув вірша -21).',
        },
      ];
    }
    if (chapter >= 10 && chapter <= 112) {
      const mtChap = chapter + 1;
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: chapter,
          targetChapter: mtChap,
          note: `LXX Пс ${chapter} -> MT Ps ${mtChap} (зсув нумерації розділу +1 у масоретській традиції / MT_chapter = LXX_chapter + 1).`,
        },
      ];
    }
    if (chapter === 113) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 113,
          sourceVerseStart: 1,
          sourceVerseEnd: 8,
          targetChapter: 114,
          targetVerseStart: 1,
          targetVerseEnd: 8,
          note: 'LXX Пс 113:1–8 -> MT Ps 114:1–8 (перша частина LXX Пс 113 становить MT Ps 114).',
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 113,
          sourceVerseStart: 9,
          sourceVerseEnd: 26,
          targetChapter: 115,
          targetVerseStart: 1,
          targetVerseEnd: 18,
          note: 'LXX Пс 113:9–26 -> MT Ps 115:1–18 (друга частина LXX Пс 113 становить MT Ps 115; зсув вірша -8).',
        },
      ];
    }
    if (chapter === 114) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 114,
          sourceVerseStart: 1,
          sourceVerseEnd: 9,
          targetChapter: 116,
          targetVerseStart: 1,
          targetVerseEnd: 9,
          note: 'LXX Пс 114:1–9 -> MT Ps 116:1–9 (LXX Пс 114 відповідає першій половині MT Ps 116).',
        },
      ];
    }
    if (chapter === 115) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 115,
          sourceVerseStart: 1,
          sourceVerseEnd: 10,
          targetChapter: 116,
          targetVerseStart: 10,
          targetVerseEnd: 19,
          note: 'LXX Пс 115:1–10 -> MT Ps 116:10–19 (LXX Пс 115 відповідає другій половині MT Ps 116; зсув вірша +9).',
        },
      ];
    }
    if (chapter >= 116 && chapter <= 145) {
      const mtChap = chapter + 1;
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: chapter,
          targetChapter: mtChap,
          note: `LXX Пс ${chapter} -> MT Ps ${mtChap} (зсув нумерації розділу +1 у масоретській традиції / MT_chapter = LXX_chapter + 1).`,
        },
      ];
    }
    if (chapter === 146) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 146,
          sourceVerseStart: 1,
          sourceVerseEnd: 11,
          targetChapter: 147,
          targetVerseStart: 1,
          targetVerseEnd: 11,
          note: 'LXX Пс 146:1–11 -> MT Ps 147:1–11 (LXX Пс 146 відповідає першій частині MT Ps 147).',
        },
      ];
    }
    if (chapter === 147) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 147,
          sourceVerseStart: 1,
          sourceVerseEnd: 9,
          targetChapter: 147,
          targetVerseStart: 12,
          targetVerseEnd: 20,
          note: 'LXX Пс 147:1–9 -> MT Ps 147:12–20 (LXX Пс 147 відповідає другій частині MT Ps 147; зсув вірша +11).',
        },
      ];
    }
    // 148–150
    return [
      {
        sourceTradition,
        targetTradition,
        sourceChapter: chapter,
        targetChapter: chapter,
        note: `LXX Пс ${chapter} = MT Ps ${chapter} (Псалми 148–150 мають однакову нумерацію / identical chapter numbers).`,
      },
    ];
  } else {
    // MT -> LXX whole chapter
    if (chapter >= 1 && chapter <= 8) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: chapter,
          targetChapter: chapter,
          note: `MT Ps ${chapter} = LXX Пс ${chapter} (Псалми 1–8 мають однакову нумерацію / identical chapter numbers).`,
        },
      ];
    }
    if (chapter === 9) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 9,
          sourceVerseStart: 1,
          sourceVerseEnd: 21,
          targetChapter: 9,
          targetVerseStart: 1,
          targetVerseEnd: 21,
          note: 'MT Ps 9:1–21 -> LXX Пс 9:1–21 (MT Ps 9 становить першу частину LXX Пс 9).',
        },
      ];
    }
    if (chapter === 10) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 10,
          sourceVerseStart: 1,
          sourceVerseEnd: 18,
          targetChapter: 9,
          targetVerseStart: 22,
          targetVerseEnd: 39,
          note: 'MT Ps 10:1–18 -> LXX Пс 9:22–39 (MT Ps 10 становить другу частину LXX Пс 9; зсув вірша +21).',
        },
      ];
    }
    if (chapter >= 11 && chapter <= 113) {
      const lxxChap = chapter - 1;
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: chapter,
          targetChapter: lxxChap,
          note: `MT Ps ${chapter} -> LXX Пс ${lxxChap} (зсув нумерації розділу -1 за Септуагінтою / LXX_chapter = MT_chapter - 1).`,
        },
      ];
    }
    if (chapter === 114) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 114,
          sourceVerseStart: 1,
          sourceVerseEnd: 8,
          targetChapter: 113,
          targetVerseStart: 1,
          targetVerseEnd: 8,
          note: 'MT Ps 114:1–8 -> LXX Пс 113:1–8 (MT Ps 114 становить першу частину LXX Пс 113).',
        },
      ];
    }
    if (chapter === 115) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 115,
          sourceVerseStart: 1,
          sourceVerseEnd: 18,
          targetChapter: 113,
          targetVerseStart: 9,
          targetVerseEnd: 26,
          note: 'MT Ps 115:1–18 -> LXX Пс 113:9–26 (MT Ps 115 становить другу частину LXX Пс 113; зсув вірша +8).',
        },
      ];
    }
    if (chapter === 116) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 116,
          sourceVerseStart: 1,
          sourceVerseEnd: 9,
          targetChapter: 114,
          targetVerseStart: 1,
          targetVerseEnd: 9,
          note: 'MT Ps 116:1–9 -> LXX Пс 114:1–9 (перша частина MT Ps 116 відповідає LXX Пс 114).',
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 116,
          sourceVerseStart: 10,
          sourceVerseEnd: 19,
          targetChapter: 115,
          targetVerseStart: 1,
          targetVerseEnd: 10,
          note: 'MT Ps 116:10–19 -> LXX Пс 115:1–10 (друга частина MT Ps 116 відповідає LXX Пс 115; зсув вірша -9).',
        },
      ];
    }
    if (chapter >= 117 && chapter <= 146) {
      const lxxChap = chapter - 1;
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: chapter,
          targetChapter: lxxChap,
          note: `MT Ps ${chapter} -> LXX Пс ${lxxChap} (зсув нумерації розділу -1 за Септуагінтою / LXX_chapter = MT_chapter - 1).`,
        },
      ];
    }
    if (chapter === 147) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 147,
          sourceVerseStart: 1,
          sourceVerseEnd: 11,
          targetChapter: 146,
          targetVerseStart: 1,
          targetVerseEnd: 11,
          note: 'MT Ps 147:1–11 -> LXX Пс 146:1–11 (перша частина MT Ps 147 відповідає LXX Пс 146).',
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 147,
          sourceVerseStart: 12,
          sourceVerseEnd: 20,
          targetChapter: 147,
          targetVerseStart: 1,
          targetVerseEnd: 9,
          note: 'MT Ps 147:12–20 -> LXX Пс 147:1–9 (друга частина MT Ps 147 відповідає LXX Пс 147; зсув вірша -11).',
        },
      ];
    }
    // 148–150
    return [
      {
        sourceTradition,
        targetTradition,
        sourceChapter: chapter,
        targetChapter: chapter,
        note: `MT Ps ${chapter} = LXX Пс ${chapter} (Псалми 148–150 мають однакову нумерацію / identical chapter numbers).`,
      },
    ];
  }
}

function mapPsalmVerseRange(
  chapter: number,
  range: VerseRange,
  sourceTradition: VersificationTradition,
  targetTradition: VersificationTradition
): PsalmMappingSegment[] {
  const { start, end } = range;

  if (sourceTradition === 'LXX' && targetTradition === 'MT') {
    // Check if LXX chapter 9 spans across verse 21
    if (chapter === 9 && start <= 21 && end >= 22) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 9,
          sourceVerseStart: start,
          sourceVerseEnd: 21,
          targetChapter: 9,
          targetVerseStart: start,
          targetVerseEnd: 21,
          note: `LXX Пс 9:${start}–21 -> MT Ps 9:${start}–21 (вірші 1–21 збігаються 1:1).`,
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 9,
          sourceVerseStart: 22,
          sourceVerseEnd: end,
          targetChapter: 10,
          targetVerseStart: 1,
          targetVerseEnd: end - 21,
          note: `LXX Пс 9:22–${end} -> MT Ps 10:1–${end - 21} (зсув вірша -21 у MT Ps 10).`,
        },
      ];
    }

    // Check if LXX chapter 113 spans across verse 8
    if (chapter === 113 && start <= 8 && end >= 9) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 113,
          sourceVerseStart: start,
          sourceVerseEnd: 8,
          targetChapter: 114,
          targetVerseStart: start,
          targetVerseEnd: 8,
          note: `LXX Пс 113:${start}–8 -> MT Ps 114:${start}–8 (перша частина LXX Пс 113).`,
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 113,
          sourceVerseStart: 9,
          sourceVerseEnd: end,
          targetChapter: 115,
          targetVerseStart: 1,
          targetVerseEnd: end - 8,
          note: `LXX Пс 113:9–${end} -> MT Ps 115:1–${end - 8} (друга частина LXX Пс 113; зсув вірша -8).`,
        },
      ];
    }
  } else if (sourceTradition === 'MT' && targetTradition === 'LXX') {
    // Check if MT chapter 116 spans across verse 9
    if (chapter === 116 && start <= 9 && end >= 10) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 116,
          sourceVerseStart: start,
          sourceVerseEnd: 9,
          targetChapter: 114,
          targetVerseStart: start,
          targetVerseEnd: 9,
          note: `MT Ps 116:${start}–9 -> LXX Пс 114:${start}–9 (перша частина MT Ps 116).`,
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 116,
          sourceVerseStart: 10,
          sourceVerseEnd: end,
          targetChapter: 115,
          targetVerseStart: 1,
          targetVerseEnd: end - 9,
          note: `MT Ps 116:10–${end} -> LXX Пс 115:1–${end - 9} (друга частина MT Ps 116; зсув вірша -9).`,
        },
      ];
    }

    // Check if MT chapter 147 spans across verse 11
    if (chapter === 147 && start <= 11 && end >= 12) {
      return [
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 147,
          sourceVerseStart: start,
          sourceVerseEnd: 11,
          targetChapter: 146,
          targetVerseStart: start,
          targetVerseEnd: 11,
          note: `MT Ps 147:${start}–11 -> LXX Пс 146:${start}–11 (перша частина MT Ps 147).`,
        },
        {
          sourceTradition,
          targetTradition,
          sourceChapter: 147,
          sourceVerseStart: 12,
          sourceVerseEnd: end,
          targetChapter: 147,
          targetVerseStart: 1,
          targetVerseEnd: end - 11,
          note: `MT Ps 147:12–${end} -> LXX Пс 147:1–${end - 11} (друга частина MT Ps 147; зсув вірша -11).`,
        },
      ];
    }
  }

  // Otherwise, start and end map into the same target chapter
  const startMapped = mapSinglePsalmVerse(
    chapter,
    start,
    sourceTradition,
    targetTradition
  );
  const endMapped = mapSinglePsalmVerse(
    chapter,
    end,
    sourceTradition,
    targetTradition
  );

  return [
    {
      sourceTradition,
      targetTradition,
      sourceChapter: chapter,
      sourceVerseStart: start,
      sourceVerseEnd: end,
      targetChapter: startMapped.chapter,
      targetVerseStart: startMapped.verse,
      targetVerseEnd: endMapped.verse,
      note:
        start === end
          ? startMapped.note
          : formatRangeMappingNote(
              sourceTradition,
              targetTradition,
              chapter,
              start,
              end,
              startMapped.chapter,
              startMapped.verse,
              endMapped.verse
            ),
    },
  ];
}

function formatRangeMappingNote(
  sourceTradition: VersificationTradition,
  targetTradition: VersificationTradition,
  srcChap: number,
  srcStart: number,
  srcEnd: number,
  tgtChap: number,
  tgtStart: number,
  tgtEnd: number
): string {
  const srcPrefix = sourceTradition === 'LXX' ? 'LXX Пс' : 'MT Ps';
  const tgtPrefix = targetTradition === 'LXX' ? 'LXX Пс' : 'MT Ps';
  const srcCoord = `${srcPrefix} ${srcChap}:${srcStart}–${srcEnd}`;
  const tgtCoord = `${tgtPrefix} ${tgtChap}:${tgtStart}–${tgtEnd}`;

  if (srcChap === tgtChap && srcStart === tgtStart && srcEnd === tgtEnd) {
    return `${srcCoord} = ${tgtCoord} (нумерація збігається / 1:1 mapping).`;
  }

  if (srcChap !== tgtChap && srcStart === tgtStart && srcEnd === tgtEnd) {
    const diff = tgtChap - srcChap;
    const sign = diff > 0 ? `+${diff}` : `${diff}`;
    return `${srcCoord} -> ${tgtCoord} (зсув розділу ${sign}, вірші збігаються).`;
  }

  const vDiff = tgtStart - srcStart;
  const vSign = vDiff > 0 ? `+${vDiff}` : `${vDiff}`;
  return `${srcCoord} -> ${tgtCoord} (розділ ${srcChap} -> ${tgtChap}, зсув віршів ${vSign}).`;
}

function buildTargetReferences(
  originalRef: ParsedReference,
  segments: PsalmMappingSegment[],
  targetTradition: VersificationTradition
): ParsedReference[] {
  const grouped = new Map<number, VerseRange[] | undefined>();

  for (const seg of segments) {
    const existing = grouped.get(seg.targetChapter);
    if (seg.targetVerseStart !== undefined && seg.targetVerseEnd !== undefined) {
      const list = existing ?? [];
      list.push({ start: seg.targetVerseStart, end: seg.targetVerseEnd });
      grouped.set(seg.targetChapter, list);
    } else {
      grouped.set(seg.targetChapter, undefined);
    }
  }

  const targetBookName = targetTradition === 'LXX' ? 'Пс' : 'Ps';
  const results: ParsedReference[] = [];

  for (const [targetChapter, ranges] of grouped.entries()) {
    const partial: ParsedReference = {
      raw: '',
      bookNumber: originalRef.bookNumber,
      bookName: targetBookName,
      chapter: targetChapter,
      inputTraditionHint: targetTradition,
    };
    if (ranges && ranges.length > 0) {
      partial.ranges = ranges;
    }
    partial.raw = formatParsedReference(
      partial,
      targetTradition === 'LXX' ? 'ua' : 'en'
    );
    results.push(partial);
  }

  return results;
}

/**
 * Generates a detailed human-readable Ukrainian & English versification description
 * for a given Psalm reference (used for `--info` CLI output).
 */
export function describePsalmVersification(
  ref: ParsedReference,
  sourceTradition?: VersificationTradition
): PsalmConversionResult {
  const effectiveSource: VersificationTradition =
    sourceTradition ?? ref.inputTraditionHint ?? 'LXX';
  const effectiveTarget: VersificationTradition =
    effectiveSource === 'LXX' ? 'MT' : 'LXX';

  return convertPsalmReference(ref, effectiveSource, effectiveTarget);
}
