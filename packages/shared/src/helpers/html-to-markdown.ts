import TurndownService from 'turndown'

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  // two trailing spaces = hard line break in markdown (matches what we produce
  // in tiptapHtmlToMarkdown when converting shift+enter back out of tiptap)
  br: '  '
})

// preserve mention spans as raw html so they survive the round-trip back
// through marked when the edited message is re-saved
td.addRule('mention', {
  filter: (node) =>
    node.nodeName === 'SPAN' &&
    (node as Element).getAttribute('data-type') === 'mention',
  replacement: (_content, node) => (node as Element).outerHTML
})

// converts stored message html back to a markdown string
const htmlToMarkdown = (html: string): string => td.turndown(html)

const FENCE_LINE_RE = /^(`{3,}|~{3,})/

// converts stored message html back to tiptap-compatible paragraph html for
// editing -- each line of markdown becomes a <p> so that tiptap displays all
// characters literally (including backtick fences) with whitespace preserved
const htmlToTiptapHtml = (html: string): string => {
  const markdown = htmlToMarkdown(html)
  if (!markdown) return ''

  const lines = markdown.split('\n')
  // turndown always emits a blank line before an opening fence as a block
  // separator -- but the user never typed that blank line, so drop it
  const filtered = lines.filter(
    (line, i) =>
      !(line === '' && i + 1 < lines.length && FENCE_LINE_RE.test(lines[i + 1] ?? ''))
  )

  return filtered.map((line) => `<p>${line}</p>`).join('')
}

export { htmlToMarkdown, htmlToTiptapHtml }
