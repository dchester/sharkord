import { describe, expect, test } from 'bun:test';
import { prepareMessageHtml } from '../prepare-message-html';

// prepareMessageHtml now converts tiptap paragraph html → markdown → html
// so each test sends in what tiptap getHTML() would produce and checks the
// final html that gets stored in the database

describe('prepareMessageHtml', () => {
  test('plain paragraph is wrapped in a <p> tag', () => {
    expect(prepareMessageHtml('<p>hello world</p>')).toBe(
      '<p>hello world</p>\n'
    )
  })

  test('markdown heading is rendered as <h1>', () => {
    expect(prepareMessageHtml('<p># my heading</p>')).toBe(
      '<h1>my heading</h1>\n'
    )
  })

  test('bold markdown is rendered as <strong>', () => {
    expect(prepareMessageHtml('<p>**hello** world</p>')).toBe(
      '<p><strong>hello</strong> world</p>\n'
    )
  })

  test('italic markdown is rendered as <em>', () => {
    expect(prepareMessageHtml('<p>_hello_ world</p>')).toBe(
      '<p><em>hello</em> world</p>\n'
    )
  })

  test('two paragraphs become two <p> blocks', () => {
    const result = prepareMessageHtml('<p>first</p><p>second</p>')
    expect(result).toContain('<p>first</p>')
    expect(result).toContain('<p>second</p>')
  })

  test('hard-break inside a paragraph becomes a <br>', () => {
    const result = prepareMessageHtml(
      '<p>line one<br class="hard-break">line two</p>'
    )
    expect(result).toContain('<br>')
    expect(result).toContain('line one')
    expect(result).toContain('line two')
  })

  test('inline mention span is passed through unchanged', () => {
    const mention = '<span data-type="mention" data-user-id="42">@alice</span>'
    const result = prepareMessageHtml(`<p>hello ${mention}</p>`)
    expect(result).toContain('data-type="mention"')
    expect(result).toContain('data-user-id="42"')
  })

  test('bare url is linkified', () => {
    const result = prepareMessageHtml('<p>see https://example.com</p>')
    expect(result).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>'
    )
  })

  test('empty string returns empty string', () => {
    expect(prepareMessageHtml('')).toBe('')
  })
})
