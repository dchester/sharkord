import { linkifyHtml } from './linkify-html';
import { markdownToHtml } from './markdown-to-html';

// applies all pre-send transformations to outgoing message html in the correct order:
// 1. convert tiptap paragraph html → markdown → rendered html
// 2. linkify any bare urls that weren't already markdown links
const prepareMessageHtml = (html: string): string =>
  linkifyHtml(markdownToHtml(html));

export { prepareMessageHtml };
