// The case form's text boxes save formatted text as HTML (bold, bullet and numbered lists). These two helpers are
// how that HTML is shown anywhere: on a page (only the formatting the editor can make is let through, so a case can
// never carry a script or a link into a reviewer's browser), or as plain words where formatting has no place.

const ALLOWED = 'p|br|strong|b|em|i|u|s|ul|ol|li';
const ALLOWED_TAG = new RegExp(`^<(/?)(${ALLOWED})(?:\\s[^>]*)?(/?)>$`, 'i');

/** Keeps paragraphs, line breaks, bold/italic/underline and lists; drops every other tag and all attributes. */
export function sanitizeRichText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>?/g, (tag) => {
      const m = tag.match(ALLOWED_TAG);
      return m ? `<${m[1]}${m[2].toLowerCase()}${m[3]}>` : '';
    });
}

/** "<p>Not needed</p><ul><li>a</li></ul>" → "Not needed a": for a sentence, a PDF line or a spreadsheet cell. */
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/(p|li|ul|ol)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when a formatted-text value has nothing in it (the editor leaves "<p></p>" behind when emptied). */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  return richTextToPlain(html) === '';
}
