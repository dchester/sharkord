import { Marked } from 'marked'

const marked = new Marked({
  async: false,
  gfm: true,
  // we handle line breaks ourselves via the tiptap→markdown conversion
  breaks: false,
  // add safe link attributes to all auto-linked and markdown links
  renderer: {
    link({ href, title, text }) {
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
    }
  }
})

// extracts the inner content of a single tiptap <p>...</p> block,
// replacing hard-break <br> tags with markdown line breaks (two trailing
// spaces + newline so marked renders them as <br>)
const extractParagraphContent = (pHtml: string): string =>
  pHtml
    // hard-break br inserted by tiptap shift+enter
    .replace(/<br\s[^>]*class="hard-break"[^>]*>/gi, '  \n')
    // any other bare <br> also becomes a markdown line break
    .replace(/<br\s*\/?>/gi, '  \n')

const FENCE_RE = /^(`{3,}|~{3,})/

// converts tiptap's paragraph-wrapped HTML output to a markdown string that
// preserves inline HTML nodes (mentions, emoji images etc) as passthrough
const tiptapHtmlToMarkdown = (html: string): string => {
  // split on <p>...</p> blocks, keeping the inner content
  // tiptap always wraps in <p> for paragraph content
  const paragraphs: string[] = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null

  while ((match = pRegex.exec(html)) !== null) {
    const inner = match[1] ?? ''
    paragraphs.push(extractParagraphContent(inner))
  }

  // if there were no <p> tags at all (e.g. empty or unusual content),
  // fall back to treating the raw html as the content
  if (paragraphs.length === 0) {
    return html
  }

  // join paragraphs: prose paragraphs use \n\n, but lines inside a fenced
  // code block use \n (they're code lines, not separate paragraphs)
  let inFence = false
  let result = ''

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i] ?? ''

    if (i === 0) {
      result += para
    } else {
      result += (inFence ? '\n' : '\n\n') + para
    }

    if (FENCE_RE.test(para.trimStart())) {
      inFence = !inFence
    }
  }

  return result
}

// converts tiptap editor HTML to final HTML via markdown rendering
// inline HTML nodes (mentions, emoji) are passed through by marked unchanged
const markdownToHtml = (tiptapHtml: string): string => {
  const markdown = tiptapHtmlToMarkdown(tiptapHtml)
  return marked.parse(markdown) as string
}

export { markdownToHtml, tiptapHtmlToMarkdown }
