import cheerioLoad from '../plugin/cheerioLoader.ts';

/** Converts an HTML fragment to plain text, keeping paragraph and line breaks. */
const htmlToText = (html: string | null | undefined): string | null => {
  if (!html) return null;
  const $ = cheerioLoad(html);
  $('br').replaceWith('\n');
  $('p, li, div').append('\n');
  const text = $.root()
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
};

export default htmlToText;
