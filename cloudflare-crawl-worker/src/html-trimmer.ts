const REMOVE_TAGS = ["script", "style", "noscript", "nav", "footer", "header", "svg", "iframe"];
const REMOVE_ATTRS = /\s(data-[\w-]+|style|class|onclick|onload|onerror)="[^"]*"/g;
const COMMENT_RE = /<!--[\s\S]*?-->/g;

export function trimHtml(html: string): string {
  let result = html;

  result = result.replace(COMMENT_RE, "");

  for (const tag of REMOVE_TAGS) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    result = result.replace(re, "");
    const selfRe = new RegExp(`<${tag}[^>]*/>`, "gi");
    result = result.replace(selfRe, "");
  }

  result = result.replace(REMOVE_ATTRS, "");
  result = result.replace(/\s{2,}/g, " ");

  if (result.length > 100_000) {
    const mainMatch =
      result.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      result.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      result.match(/<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i);
    if (mainMatch) {
      result = mainMatch[1];
    } else {
      result = result.substring(0, 100_000);
    }
  }

  return result.trim();
}

export function hasProductLinks(html: string): boolean {
  const linkCount = (html.match(/<a\s[^>]*href/gi) || []).length;
  return linkCount >= 3;
}
