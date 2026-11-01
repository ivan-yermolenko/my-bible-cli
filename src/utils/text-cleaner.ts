import type { CleanTextOptions } from '../types.js';

/**
 * Cleans MyBible SQLite XML-like markup tags from verse, commentary, or dictionary text.
 *
 * Supported tags:
 * - `<S>1234</S>` or `<s ...>...</s>`: Strong's numbers
 * - `<n>...</n>` and `<f>...</f>`: translator notes / footnotes
 * - `<i>...</i>`: supplied words (italics)
 * - `<J>...</J>`: words of Jesus
 * - `<pb/>`, `<br/>`, `<t>`, `</t>`, `<e>...</e>`, `<h>...</h>`: layout and header tags
 */
export function cleanMyBibleText(rawText: string, options: CleanTextOptions = {}): string {
  if (!rawText) {
    return '';
  }

  let text = rawText;

  // 1. Strip headers <h>...</h> completely (replace with space to avoid gluing adjacent words)
  text = text.replace(/<h\b[^>]*>[\s\S]*?<\/h>/gi, ' ');

  // 2. Handle Strong's numbers: <S>1234</S> or <s ...>1234</s>
  // In MyBible, Strong's tags follow the word they modify, e.g., "Бог<S>2316</S>".
  text = text.replace(/\s*<S\b[^>]*>([\s\S]*?)<\/S>/gi, (_match, inner: string) => {
    if (!options.keepStrongs) {
      return '';
    }
    const cleanNum = inner.trim();
    if (!cleanNum) {
      return '';
    }
    if (/^[HG]\d+$/i.test(cleanNum)) {
      return ` [${cleanNum.toUpperCase()}]`;
    }
    return ` [#${cleanNum}]`;
  });

  // 3. Handle translator notes <n>...</n> and footnotes <f>...</f>
  // Sometimes notes look like <n>[1]</n> or <f>①</f> or <n>Примітка перекладача</n>.
  text = text.replace(/\s*<(?:n|f)\b[^>]*>([\s\S]*?)<\/(?:n|f)>/gi, (_match, inner: string) => {
    if (!options.keepNotes) {
      return '';
    }
    // Clean any nested tags inside the note first
    const cleanNote = inner
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanNote) {
      return '';
    }
    return ` [Прим.: ${cleanNote}]`;
  });

  // 4. Handle supplied words <i>...</i>
  text = text.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, (_match, inner: string) => {
    const trimmed = inner.trim();
    if (!trimmed) {
      return '';
    }
    if (options.markdownItalics) {
      return `*${trimmed}*`;
    }
    return trimmed;
  });

  // 5. Handle words of Jesus <J>...</J>
  text = text.replace(/<J\b[^>]*>([\s\S]*?)<\/J>/gi, '$1');

  // 6. Handle <e>...</e> (emphasis / cross-ref / explanation in some modules) - unwrap content
  text = text.replace(/<e\b[^>]*>([\s\S]*?)<\/e>/gi, '$1');

  // 7. Replace paragraph breaks <pb/>, <br/>, <p>, </p> with a single space so words never glue together
  text = text.replace(/<(?:pb|br)\s*\/?>/gi, ' ');
  text = text.replace(/<\/?(?:t|p)\b[^>]*>/gi, ' ');

  // 8. Strip any remaining unrecognized XML/HTML tags safely (replace self-closing or block tags with space or unwrap)
  text = text.replace(/<[^>]+>/g, ' ');

  // 9. Fix spacing before punctuation that might have been left after stripping tags
  text = text.replace(/\s+([,.;:!?»”)\]])/g, '$1');
  text = text.replace(/([«“(\[])\s+/g, '$1');

  // 10. Collapse multiple spaces into a single space and trim
  return text.replace(/\s+/g, ' ').trim();
}
