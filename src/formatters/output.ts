import pc from 'picocolors';
import { getBookByNumber } from '../parser/book-names.js';
import { formatParsedReference } from '../parser/reference-parser.js';
import type {
  CommentaryEntry,
  DictionaryEntry,
  OutputFormat,
  ParsedReference,
  PassageQueryResult,
} from '../types.js';

export interface FormatPassageOptions {
  format?: OutputFormat;
  info?: boolean;
  verseByVerse?: boolean;
}

function formatEffectiveRefsTitle(result: PassageQueryResult): string {
  const book = getBookByNumber(result.parsedReference.bookNumber);
  const isCyrillic = result.module.language
    ? result.module.language === 'uk' || result.module.language === 'ru'
    : result.parsedReference.inputTraditionHint === 'LXX';

  const bookTitle = book
    ? isCyrillic
      ? result.module.language === 'ru'
        ? book.longNameRu
        : book.longNameUa
      : book.longNameEn
    : result.parsedReference.bookName;

  const refs =
    result.effectiveReference.length > 0
      ? result.effectiveReference
      : [result.parsedReference];

  const coordParts = refs.map((r) => {
    if (!r.ranges || r.ranges.length === 0) {
      return `${r.chapter}`;
    }
    const rStr = r.ranges
      .map((rg) => (rg.start === rg.end ? `${rg.start}` : `${rg.start}-${rg.end}`))
      .join(',');
    return `${r.chapter}:${rStr}`;
  });

  return `${bookTitle} ${coordParts.join('; ')}`;
}

function shouldShowVersificationInfo(
  result: PassageQueryResult,
  infoFlag?: boolean,
): boolean {
  if (!result.versificationInfo) {
    return false;
  }
  return Boolean(infoFlag || result.versificationInfo.isChanged);
}

/**
 * Formats a single `PassageQueryResult` into `'pretty' | 'md' | 'raw' | 'json'`.
 */
export function formatPassageResult(
  result: PassageQueryResult,
  options: FormatPassageOptions = {},
): string {
  const format: OutputFormat = options.format ?? 'pretty';

  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'raw') {
    return result.verses
      .map((v) => {
        const prefix =
          result.effectiveReference.length > 1
            ? `${v.chapter}:${v.verse}`
            : `${v.verse}`;
        return `${prefix} ${v.cleanText}`;
      })
      .join('\n');
  }

  const title = formatEffectiveRefsTitle(result);
  const modUpper = result.module.id.toUpperCase();
  const traditionTag = result.module.tradition ? ` — ${result.module.tradition}` : '';
  const showVersInfo = shouldShowVersificationInfo(result, options.info);

  if (format === 'md') {
    const lines: string[] = [];
    lines.push(`### ${title} (${modUpper}${traditionTag})`);
    lines.push('');

    if (showVersInfo && result.versificationInfo) {
      const vi = result.versificationInfo;
      lines.push(
        `> [!NOTE] **Нумерація Псалмів (${vi.sourceTradition} ↔ ${vi.targetTradition})**`,
      );
      for (const note of vi.mappingNotes) {
        lines.push(`> - ${note}`);
      }
      lines.push('');
    }

    if (result.verses.length === 0) {
      lines.push('> *(Вірші не знайдено / No verses found)*');
    } else {
      for (const v of result.verses) {
        const vLabel =
          result.effectiveReference.length > 1
            ? `${v.chapter}:${v.verse}`
            : `${v.verse}`;
        const mappedSuffix =
          v.mappedFrom &&
          (v.mappedFrom.chapter !== v.chapter || v.mappedFrom.verse !== v.verse)
            ? ` *(${v.mappedFrom.tradition} ${v.mappedFrom.chapter}:${v.mappedFrom.verse})*`
            : '';
        lines.push(`> **${vLabel}**${mappedSuffix} ${v.cleanText}`);
      }
      const shortRef = result.effectiveReference
        .map((r) =>
          formatParsedReference(
            r,
            result.module.language === 'en' ? 'en' : 'ua',
          ),
        )
        .join('; ');
      lines.push(`>\n> — *(${shortRef}, ${modUpper})*`);
    }

    return lines.join('\n');
  }

  // 'pretty' format
  const lines: string[] = [];
  const badge = pc.dim(
    `[${modUpper}${result.module.tradition ? ` • ${result.module.tradition}` : ''}]`,
  );
  lines.push(`${pc.bold(pc.cyan(title))} ${badge}`);

  if (options.info && result.module.description) {
    lines.push(pc.dim(`Модуль: ${result.module.description} (${result.module.filePath})`));
  }

  if (showVersInfo && result.versificationInfo) {
    const vi = result.versificationInfo;
    lines.push(
      pc.yellow(
        `ℹ [Нумерація Псалмів ${vi.sourceTradition} -> ${vi.targetTradition}] ${vi.mappingNotes.join(' | ')}`,
      ),
    );
  }

  lines.push(pc.dim('─'.repeat(Math.min(72, Math.max(36, title.length + 14)))));

  if (result.verses.length === 0) {
    lines.push(pc.red('Вірші не знайдено у модулі / No verses found.'));
  } else {
    for (const v of result.verses) {
      const vLabel =
        result.effectiveReference.length > 1
          ? `${v.chapter}:${v.verse}`
          : `${v.verse}`;
      const mappedHint =
        v.mappedFrom &&
        (v.mappedFrom.chapter !== v.chapter || v.mappedFrom.verse !== v.verse)
          ? pc.dim(` (${v.mappedFrom.tradition} ${v.mappedFrom.chapter}:${v.mappedFrom.verse})`)
          : '';
      lines.push(`${pc.bold(pc.green(vLabel))}${mappedHint} ${v.cleanText}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats multiple `PassageQueryResult[]` for `mybible compare`.
 */
export function formatComparisonResults(
  results: PassageQueryResult[],
  options: FormatPassageOptions = {},
): string {
  const format: OutputFormat = options.format ?? 'pretty';

  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }

  if (results.length === 0) {
    return '';
  }

  if (options.verseByVerse && format !== 'raw') {
    return formatInterleavedComparison(results, format, options.info);
  }

  if (format === 'raw') {
    return results
      .map((r) => {
        const header = `[${r.module.id.toUpperCase()}${r.module.tradition ? ` ${r.module.tradition}` : ''}]`;
        const body = formatPassageResult(r, { ...options, format: 'raw' });
        return `${header}\n${body}`;
      })
      .join('\n\n');
  }

  if (format === 'md') {
    const blocks = results.map((r) =>
      formatPassageResult(r, { ...options, format: 'md' }),
    );
    return blocks.join('\n\n---\n\n');
  }

  // 'pretty' side-by-side / sequential blocks
  const blocks = results.map((r) =>
    formatPassageResult(r, { ...options, format: 'pretty' }),
  );
  return blocks.join('\n\n');
}

function formatInterleavedComparison(
  results: PassageQueryResult[],
  format: OutputFormat,
  info?: boolean,
): string {
  const first = results[0];
  const baseTitle = formatEffectiveRefsTitle(first);
  const lines: string[] = [];

  if (format === 'md') {
    lines.push(`### Порівняння перекладів: ${baseTitle}`);
    lines.push('');
  } else {
    lines.push(pc.bold(pc.cyan(`Порівняння перекладів: ${baseTitle}`)));
    lines.push(pc.dim('═'.repeat(60)));
  }

  // Show any cross-tradition notes first
  for (const r of results) {
    if (shouldShowVersificationInfo(r, info) && r.versificationInfo) {
      const noteText = `[${r.module.id.toUpperCase()} • ${r.module.tradition}] ${r.versificationInfo.mappingNotes.join(' ')}`;
      if (format === 'md') {
        lines.push(`> [!NOTE] ${noteText}`);
      } else {
        lines.push(pc.yellow(`ℹ ${noteText}`));
      }
    }
  }

  const maxLen = Math.max(...results.map((r) => r.verses.length), 0);
  for (let i = 0; i < maxLen; i++) {
    if (i > 0) {
      lines.push('');
    }
    for (const r of results) {
      const v = r.verses[i];
      if (!v) continue;
      const modBadge = `${r.module.id.toUpperCase()}${r.module.tradition ? `/${r.module.tradition}` : ''}`;
      const coord = `${v.chapter}:${v.verse}`;
      if (format === 'md') {
        lines.push(`- **${modBadge}** (${coord}): ${v.cleanText}`);
      } else {
        lines.push(
          `${pc.bold(pc.cyan(`[${modBadge}]`))} ${pc.green(coord)} ${v.cleanText}`,
        );
      }
    }
  }

  return lines.join('\n');
}

/**
 * Formats commentary entries into `'pretty' | 'md' | 'raw' | 'json'`.
 */
export function formatCommentaryEntries(
  ref: ParsedReference,
  entries: CommentaryEntry[],
  format: OutputFormat = 'pretty',
): string {
  if (format === 'json') {
    return JSON.stringify({ reference: ref, entries }, null, 2);
  }

  if (format === 'raw') {
    return entries
      .map(
        (e) =>
          `${e.chapterFrom}:${e.verseFrom}-${e.verseTo} [${e.moduleId}] ${e.cleanText}`,
      )
      .join('\n\n');
  }

  const refLabel = formatParsedReference(ref, 'ua');

  if (format === 'md') {
    const lines = [`### Коментарі: ${refLabel}`, ''];
    if (entries.length === 0) {
      lines.push('> *(Коментарів не знайдено / No commentary entries found)*');
    } else {
      for (const e of entries) {
        const rangeLabel =
          e.verseFrom === e.verseTo
            ? `${e.chapterFrom}:${e.verseFrom}`
            : `${e.chapterFrom}:${e.verseFrom}-${e.verseTo}`;
        lines.push(`> **[${e.moduleId.toUpperCase()}] ${rangeLabel}** — ${e.cleanText}`);
        lines.push('');
      }
    }
    return lines.join('\n').trimEnd();
  }

  const lines = [
    `${pc.bold(pc.cyan(`Коментарі до ${refLabel}`))}`,
    pc.dim('─'.repeat(48)),
  ];
  if (entries.length === 0) {
    lines.push(pc.yellow('Коментарів не знайдено / No commentary entries found.'));
  } else {
    for (const e of entries) {
      const rangeLabel =
        e.verseFrom === e.verseTo
          ? `${e.chapterFrom}:${e.verseFrom}`
          : `${e.chapterFrom}:${e.verseFrom}-${e.verseTo}`;
      lines.push(
        `${pc.bold(pc.green(rangeLabel))} ${pc.dim(`[${e.moduleId.toUpperCase()}]`)} ${e.cleanText}`,
      );
    }
  }
  return lines.join('\n');
}

/**
 * Formats dictionary definitions into `'pretty' | 'md' | 'raw' | 'json'`.
 */
export function formatDictionaryEntries(
  queryTopic: string,
  entries: DictionaryEntry[],
  format: OutputFormat = 'pretty',
): string {
  if (format === 'json') {
    return JSON.stringify({ query: queryTopic, entries }, null, 2);
  }

  if (format === 'raw') {
    return entries
      .map((e) => `${e.topic} [${e.moduleId}]: ${e.cleanDefinition}`)
      .join('\n\n');
  }

  if (format === 'md') {
    const lines = [`### Словник: ${queryTopic}`, ''];
    if (entries.length === 0) {
      lines.push('> *(Статей не знайдено / No dictionary entries found)*');
    } else {
      for (const e of entries) {
        lines.push(`#### ${e.topic} (${e.moduleId.toUpperCase()})`);
        lines.push(`> ${e.cleanDefinition}`);
        lines.push('');
      }
    }
    return lines.join('\n').trimEnd();
  }

  const lines = [
    `${pc.bold(pc.cyan(`Словник: "${queryTopic}"`))}`,
    pc.dim('─'.repeat(48)),
  ];
  if (entries.length === 0) {
    lines.push(pc.yellow('Статей не знайдено / No dictionary entries found.'));
  } else {
    for (const e of entries) {
      lines.push(
        `${pc.bold(pc.green(e.topic))} ${pc.dim(`[${e.moduleId.toUpperCase()}]`)}\n  ${e.cleanDefinition}`,
      );
    }
  }
  return lines.join('\n');
}
