// Minimal syntax highlighters. Tokenise left-to-right with a small set of
// patterns; HTML-escape everything for safety. Good enough for the curated
// snippets shown here - not real parsers. Output uses the .hl-* classes styled
// in demo/style.css. Consumers: the demo pages at runtime, and
// scripts/build-site.mjs at build time (fenced blocks of the rendered pages).

const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

function tokenise(src, patterns) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const rest = src.slice(i)
    let matched = false
    for (const [re, type] of patterns) {
      const m = rest.match(re)
      if (m) {
        out += `<span class="hl-${type}">${esc(m[0])}</span>`
        i += m[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      out += esc(src[i])
      i++
    }
  }
  return out
}

export function highlightJs(src) {
  const KEYWORDS = /^\b(const|let|var|function|class|extends|new|return|if|else|for|while|import|export|from|as|async|await|true|false|null|undefined|typeof|instanceof|of|in|do|switch|case|break|continue|default|throw|try|catch|finally|this|super|yield|void|static)\b/
  return tokenise(src, [
    [/^\/\/[^\n]*/, 'comment'],
    [/^\/\*[\s\S]*?\*\//, 'comment'],
    [/^"(?:[^"\\\n]|\\.)*"/, 'string'],
    [/^'(?:[^'\\\n]|\\.)*'/, 'string'],
    [/^`(?:[^`\\]|\\.)*`/, 'string'],
    [KEYWORDS, 'keyword'],
    [/^\b\d+(?:\.\d+)?\b/, 'number'],
    [/^[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\()/, 'func'],
  ])
}

/**
 * Markup highlighter, for pages whose interesting part IS the markup (the
 * AngularJS demo, where you copy the attributes rather than the JS).
 * Attribute names reuse `hl-func` and tag names `hl-keyword`, so no new CSS.
 */
export function highlightHtml(src) {
  return tokenise(src, [
    [/^<!--[\s\S]*?-->/, 'comment'],
    [/^<\/?[a-zA-Z][\w-]*/, 'keyword'],
    [/^"(?:[^"\\\n]|\\.)*"/, 'string'],
    [/^'(?:[^'\\\n]|\\.)*'/, 'string'],
    [/^\{\{[^}]*\}\}/, 'number'],
    [/^[a-zA-Z_$][\w:-]*(?==)/, 'func'],
  ])
}

/** Strip the shared leading indentation so a snippet lifted out of a page reads flush-left. */
export function dedent(src) {
  const lines = src.replace(/^\n+|\s+$/g, '').split('\n')
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  return lines.map(l => l.slice(cut)).join('\n')
}
