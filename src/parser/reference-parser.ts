import type { ParsedReference, VerseRange, VersificationTradition } from '../types.js';
import { findBookByAlias } from './book-names.js';

const CYRILLIC_RE = /[а-яіїєґё]/i;

/**
 * Parses a scripture reference string into a structured ParsedReference.
 *
 * Supported formats:
 * - "Пс 9:10-15", "Псалом 9:10", "Псалми 9:1-5,10", "Пс. 22"
 * - "Ps 9:1-10", "Psalm 9:10-15", "Psalms 23:1-6"
 * - "Рим 8:28", "Ин 3:16", "Ів 3:16", "1Кор 13:4-8", "1 Кор. 13:4–8"
 */
export function parseReference(input: string): ParsedReference {
  const raw = input.trim();
  if (!raw) {
    throw new Error('Empty scripture reference');
  }

  // Normalize dashes (en-dash, em-dash, minus sign -> standard hyphen)
  const normalized = raw.replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();

  // Match book part + chapter + optional verse ranges
  // Book part can start with optional book number (1, 2, 3, 4, I, II, III) followed by letters/spaces/dots
  const match = normalized.match(
    /^((?:[1-4]|I{1,3}|І{1,3})?[\s.\-]*[A-Za-zА-Яа-яІіЇїЄєҐґЁё'’ʼ`.\s]+?)\s*(\d+)(?:\s*[:.,]\s*([\d\s,\-]+))?$/
  );

  if (!match) {
    throw new Error(`Invalid scripture reference format: "${input}"`);
  }

  const rawBookPart = match[1].trim();
  const chapterStr = match[2];
  const versesPart = match[3]?.trim();

  const bookInfo = findBookByAlias(rawBookPart);
  if (!bookInfo) {
    throw new Error(`Unknown Bible book: "${rawBookPart}" in reference "${input}"`);
  }

  const chapter = Number.parseInt(chapterStr, 10);
  if (!Number.isInteger(chapter) || chapter < 1) {
    throw new Error(`Invalid chapter number "${chapterStr}" in reference "${input}"`);
  }

  let ranges: VerseRange[] | undefined;
  if (versesPart) {
    ranges = parseVerseRanges(versesPart, input);
  }

  let inputTraditionHint: VersificationTradition | undefined;
  if (bookInfo.bookNumber === 190) {
    inputTraditionHint = CYRILLIC_RE.test(rawBookPart) ? 'LXX' : 'MT';
  } else {
    inputTraditionHint = CYRILLIC_RE.test(rawBookPart) ? 'LXX' : 'MT';
  }

  const isCyrillicInput = CYRILLIC_RE.test(rawBookPart);
  const bookName = isCyrillicInput ? bookInfo.shortNameUa : bookInfo.shortNameEn;

  const result: ParsedReference = {
    raw,
    bookNumber: bookInfo.bookNumber,
    bookName,
    chapter,
    inputTraditionHint,
  };

  if (ranges && ranges.length > 0) {
    result.ranges = ranges;
  }

  return result;
}

function parseVerseRanges(versesPart: string, fullInput: string): VerseRange[] {
  const segments = versesPart
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  const ranges: VerseRange[] = [];

  for (const seg of segments) {
    if (seg.includes('-')) {
      const parts = seg.split('-').map((p) => p.trim());
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`Invalid verse range "${seg}" in reference "${fullInput}"`);
      }
      const start = Number.parseInt(parts[0], 10);
      const end = Number.parseInt(parts[1], 10);
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < start
      ) {
        throw new Error(`Invalid verse range "${seg}" in reference "${fullInput}"`);
      }
      ranges.push({ start, end });
    } else {
      const verse = Number.parseInt(seg, 10);
      if (!Number.isInteger(verse) || verse < 1) {
        throw new Error(`Invalid verse number "${seg}" in reference "${fullInput}"`);
      }
      ranges.push({ start: verse, end: verse });
    }
  }

  return ranges;
}

export function formatParsedReference(
  ref: ParsedReference,
  lang: 'ua' | 'en' = 'ua'
): string {
  const prefix =
    ref.bookNumber === 190
      ? lang === 'ua'
        ? 'Пс'
        : 'Ps'
      : ref.bookName;

  if (!ref.ranges || ref.ranges.length === 0) {
    return `${prefix} ${ref.chapter}`;
  }

  const rangeStr = ref.ranges
    .map((r) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`))
    .join(',');

  return `${prefix} ${ref.chapter}:${rangeStr}`;
}
