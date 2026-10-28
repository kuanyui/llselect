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
 * A tag is colored from its `<` to its `>`. Strings and attribute names count
 * only inside a tag, so text content stays plain.
 */
export function highlightHtml(src) {
  const outside = [
    [/^<!--[\s\S]*?-->/, 'comment'],
    [/^\{\{[^}]*\}\}/, 'number'],
  ]
  const inside = [
    [/^"[^"]*"/, 'string'],
    [/^'[^']*'/, 'string'],
    [/^\{\{[^}]*\}\}/, 'number'],
    [/^[^\s"'=<>/{}]+/, 'func'],
  ]
  let out = ''
  let i = 0
  let inTag = false
  while (i < src.length) {
    const rest = src.slice(i)
    const edge = inTag ? rest.match(/^\/?>/) : rest.match(/^<\/?[a-zA-Z][\w-]*/)
    let token = null
    let type = 'keyword'
    if (edge) {
      token = edge[0]
      inTag = !inTag
    } else {
      for (const [re, t] of inTag ? inside : outside) {
        const m = rest.match(re)
        if (m) {
          token = m[0]
          type = t
          break
        }
      }
    }
    out += token === null ? esc(src[i]) : `<span class="hl-${type}">${esc(token)}</span>`
    i += token === null ? 1 : token.length
  }
  return out
}

// CSS: outside a declaration block come selectors and at-rules; inside one,
// property names and values. A block opened by an at-rule such as @media
// holds rules again. A null type leaves the token plain: identifiers are
// taken whole, so the 5 in `bootstrap-5` never reads as a number.
const CSS_ANY = [
  [/^\/\*[\s\S]*?\*\//, 'comment'],
  [/^"[^"\n]*"/, 'string'],
  [/^'[^'\n]*'/, 'string'],
]
const CSS_RULES = [
  [/^@[\w-]+/, 'keyword'],
  [/^[.#]?-?[A-Za-z_][\w-]*/, 'func'],
  [/^::?[\w-]+/, 'func'],
]
const CSS_DECLS = [
  [/^-?-?[A-Za-z_][\w-]*(?=\s*:)/, 'keyword'],
  [/^!important\b/, 'keyword'],
  [/^#[0-9a-fA-F]{3,8}\b/, 'number'],
  [/^-?(?:\d+\.?\d*|\.\d+)(?:%|[A-Za-z]+)?/, 'number'],
  [/^[A-Za-z-][\w-]*(?=\()/, 'func'],
  [/^-?-?[A-Za-z_][\w-]*/, null],
]

/**
 * CSS highlighter for the fenced css blocks of the rendered pages. Selectors
 * reuse `hl-func`, at-rules and property names `hl-keyword`, numbers and
 * colors `hl-number`, so no new CSS.
 */
export function highlightCss(src) {
  const blocks = [] // one entry per open brace: true when it holds declarations
  let atRule = false
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '{' || c === '}' || c === ';') {
      if (c === '{') { blocks.push(!atRule) }
      if (c === '}') { blocks.pop() }
      atRule = false
      out += c
      i++
      continue
    }
    const rest = src.slice(i)
    const decls = blocks.length > 0 && blocks[blocks.length - 1]
    let token = null
    let type = null
    for (const [re, t] of [...CSS_ANY, ...(decls ? CSS_DECLS : CSS_RULES)]) {
      const m = rest.match(re)
      if (m) {
        token = m[0]
        type = t
        break
      }
    }
    if (!decls && type === 'keyword') { atRule = true }
    out += token === null ? esc(c) : type === null ? esc(token) : `<span class="hl-${type}">${esc(token)}</span>`
    i += token === null ? 1 : token.length
  }
  return out
}

/** Strip the shared leading indentation so a snippet lifted out of a page reads flush-left. */
export function dedent(src) {
  const lines = src.replace(/^\n+|\s+$/g, '').split('\n')
  const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  return lines.map(l => l.slice(cut)).join('\n')
}
