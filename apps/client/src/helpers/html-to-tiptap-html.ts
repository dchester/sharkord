// converts stored message html back to tiptap-compatible paragraph html for
// editing, using the browser's native DOM TreeWalker -- no dependencies needed
//
// the output is a series of <p>...</p> nodes (one per line) that tiptap
// will display as raw markdown text, preserving all characters the user typed

// inline nodes we convert to markdown syntax in-place
const INLINE_OPEN: Partial<Record<string, string>> = {
  STRONG: '**',
  EM: '_',
  DEL: '~~',
  CODE: '`'
}

const INLINE_CLOSE = INLINE_OPEN

// walk an element's children and produce a markdown string for that line
// mention spans and emoji images are serialised back to their html so they
// survive the round-trip through marked when the message is re-saved
const serializeInline = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as Element
  const tag = el.tagName

  // mention span -- preserve as raw html
  if (tag === 'SPAN' && el.getAttribute('data-type') === 'mention') {
    return el.outerHTML
  }

  // emoji image -- preserve as raw html
  if (tag === 'IMG') {
    return el.outerHTML
  }

  // link
  if (tag === 'A') {
    const href = el.getAttribute('href') ?? ''
    const inner = serializeChildren(el)
    // if the link text and href are the same it's a bare auto-link, just emit the url
    if (inner === href) return href
    return `[${inner}](${href})`
  }

  // inline code -- use backtick, don't recurse (content is literal)
  if (tag === 'CODE') {
    return `\`${el.textContent ?? ''}\``
  }

  const open = INLINE_OPEN[tag]
  if (open) {
    return `${open}${serializeChildren(el)}${INLINE_CLOSE[tag]}`
  }

  // br inside a paragraph = hard line break (shift+enter)
  if (tag === 'BR') return '  \n'

  // anything else: just recurse into children
  return serializeChildren(el)
}

const serializeChildren = (el: Element): string =>
  Array.from(el.childNodes).map(serializeInline).join('')

// each block element produces one or more output lines (strings without \n)
const serializeBlock = (el: Element, lines: string[]): void => {
  const tag = el.tagName

  if (tag === 'P') {
    // a <p> with no content is a blank line
    const content = serializeChildren(el)
    lines.push(content)
    return
  }

  if (/^H[1-6]$/.test(tag)) {
    const level = parseInt(tag[1] ?? '1', 10)
    lines.push(`${'#'.repeat(level)} ${serializeChildren(el)}`)
    return
  }

  if (tag === 'BLOCKQUOTE') {
    // each child block inside the blockquote gets prefixed with >
    const inner: string[] = []
    Array.from(el.children).forEach((child) => serializeBlock(child as Element, inner))
    inner.forEach((line) => lines.push(`> ${line}`))
    return
  }

  if (tag === 'UL' || tag === 'OL') {
    Array.from(el.children).forEach((child, i) => {
      if (child.tagName !== 'LI') return
      const bullet = tag === 'OL' ? `${i + 1}.` : '-'
      lines.push(`${bullet} ${serializeChildren(child as Element)}`)
    })
    return
  }

  if (tag === 'PRE') {
    const codeEl = el.querySelector('code')
    const content = codeEl ? (codeEl.textContent ?? '') : (el.textContent ?? '')
    // emit opening fence, each code line, closing fence
    lines.push('```')
    content
      // trim a single leading/trailing newline that marked adds inside <code>
      .replace(/^\n/, '').replace(/\n$/, '')
      .split('\n')
      .forEach((line) => lines.push(line))
    lines.push('```')
    return
  }

  // fallback: treat as a paragraph
  lines.push(serializeChildren(el))
}

const htmlToTiptapHtml = (html: string): string => {
  if (!html) return ''

  const container = document.createElement('div')
  container.innerHTML = html

  const lines: string[] = []

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) lines.push(text)
      return
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      serializeBlock(node as Element, lines)
    }
  })

  // wrap each line as a tiptap paragraph
  // blank lines between a prose paragraph and an opening fence are dropped
  // (turndown would add them; we don't need them and they cause phantom newlines)
  const FENCE_RE = /^(`{3,}|~{3,})/
  const filtered = lines.filter(
    (line, i) =>
      !(line === '' && i + 1 < lines.length && FENCE_RE.test(lines[i + 1] ?? ''))
  )

  return filtered.map((line) => `<p>${line}</p>`).join('')
}

export { htmlToTiptapHtml }
