// Query-match highlighting for item content, exported like the grouping
// gather: pure (text, query) -> detached DOM, no instance state.

/**
 * Build a detached `<span>` of `text` with every `query` match wrapped for
 * highlighting.
 * - Each case-insensitive occurrence of `query` becomes a `<mark>` element;
 *   everything else stays plain text nodes.
 * - Matching mirrors the built-in filter exactly: `toLowerCase` on both
 *   sides, no trimming, scanned left to right without overlap.
 * - If `query` is `''`, the span holds the plain text and no `<mark>`.
 * - `createMatchElFn` replaces the default `<mark>` builder. It receives the
 *   matched text and must return a fully built element: the helper inserts
 *   it as-is and does not put the text inside for you.
 * - If a custom `filterFn` drives your matching, the helper cannot know its
 *   match ranges: it always marks plain substring occurrences.
 * - Intended for `createItemContentElFn` / `createItemContentEl`: they re-run
 *   on every filter keystroke, so the marks stay in sync with the query. The
 *   option's accessible name is unaffected (it comes from `itemToString`).
 * - Rare edge: if lower-casing changes the string's length (a Unicode
 *   expansion, e.g. dotted capital I, U+0130), the span degrades to plain
 *   unmarked text instead of marking wrong ranges.
 * @group Filtering
 */
export function createHighlightedTextEl(
  text: string,
  query: string,
  createMatchElFn?: (matchedText: string) => HTMLElement,
): HTMLElement {
  const span = document.createElement('span')
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  // Offsets found in lowerText are applied to text; valid only while
  // lower-casing kept both lengths (lowercase mappings only ever expand).
  if (query === '' || lowerText.length !== text.length || lowerQuery.length !== query.length) {
    span.textContent = text
    return span
  }
  let pos = 0
  while (true) {
    const idx = lowerText.indexOf(lowerQuery, pos)
    if (idx === -1) { break }
    if (idx > pos) { span.append(text.slice(pos, idx)) }
    const matchedText = text.slice(idx, idx + query.length)
    if (createMatchElFn) {
      span.append(createMatchElFn(matchedText))
    } else {
      const mark = document.createElement('mark')
      mark.textContent = matchedText
      span.append(mark)
    }
    pos = idx + query.length
  }
  if (pos < text.length) { span.append(text.slice(pos)) }
  return span
}
