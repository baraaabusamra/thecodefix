import * as cheerio from "cheerio";

export interface HtmlExtractionResult {
  extractedText: string;
  title: string | null;
}

const REMOVE_SELECTORS = "script, style, noscript, nav, header, footer, svg, iframe, form, [aria-hidden='true']";

/**
 * Converts a raw HTML buffer into plain text for AI extraction.
 * Strips chrome (nav/header/footer/scripts) so extraction isn't drowned
 * in menu links; keeps body prose, which is where curriculum tables/lists live.
 */
export function extractHtmlText(html: string | Buffer): HtmlExtractionResult {
  const $ = cheerio.load(html.toString("utf8"));
  $(REMOVE_SELECTORS).remove();

  const title = $("title").first().text().trim() || null;

  const text = $("body")
    .text()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return { extractedText: text, title };
}
