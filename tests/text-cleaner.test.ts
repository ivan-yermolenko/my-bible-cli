import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanMyBibleText } from '../src/utils/text-cleaner.js';

describe('cleanMyBibleText', () => {
  it('strips Strongs numbers by default and keeps them when keepStrongs is true', () => {
    const raw =
      'На<S>1722</S> початку<S>746</S> створив<s id="1">H1254</s> Бог<S>G2316</S> небо і землю.';
    assert.strictEqual(
      cleanMyBibleText(raw),
      'На початку створив Бог небо і землю.',
    );
    assert.strictEqual(
      cleanMyBibleText(raw, { keepStrongs: true }),
      'На [#1722] початку [#746] створив [H1254] Бог [G2316] небо і землю.',
    );
  });

  it('strips notes and footnotes by default and formats them when keepNotes is true', () => {
    const raw =
      'Слово<n>Або: Логос</n> сталося тілом<f>[1] Див. Ів. 1:1</f> і перебувало між нами.';
    assert.strictEqual(
      cleanMyBibleText(raw),
      'Слово сталося тілом і перебувало між нами.',
    );
    assert.strictEqual(
      cleanMyBibleText(raw, { keepNotes: true }),
      'Слово [Прим.: Або: Логос] сталося тілом [Прим.: [1] Див. Ів. 1:1] і перебувало між нами.',
    );
  });

  it('handles supplied words <i>...</i> as plain text or markdown italics', () => {
    const raw = 'Господь — <i>то</i> мій Пастир.';
    assert.strictEqual(cleanMyBibleText(raw), 'Господь — то мій Пастир.');
    assert.strictEqual(
      cleanMyBibleText(raw, { markdownItalics: true }),
      'Господь — *то* мій Пастир.',
    );
  });

  it('unwraps words of Jesus <J>...</J> cleanly', () => {
    const raw = 'Ісус сказав їм: <J>Я є Дорога, і Правда, і Життя!</J>';
    assert.strictEqual(
      cleanMyBibleText(raw),
      'Ісус сказав їм: Я є Дорога, і Правда, і Життя!',
    );
  });

  it('strips headers <h>...</h> and replaces <pb/> and <br/> with a single space without gluing words', () => {
    const raw =
      '<h>Псалом Давидів</h><pb/>Господь<br/>пасе мене,<t>і нічого</t> мені <e>не</e> бракуватиме.';
    assert.strictEqual(
      cleanMyBibleText(raw),
      'Господь пасе мене, і нічого мені не бракуватиме.',
    );
  });
});
