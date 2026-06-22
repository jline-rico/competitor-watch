import puppeteer from "@cloudflare/puppeteer";
import type { CrawlConfig } from "./supabase";

const DEFAULT_CONFIG: Required<CrawlConfig> = {
  waitFor: 5000,
  scrollToBottom: false,
  scrollDelay: 1000,
};

const REALISTIC_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface CrawlResult {
  ok: boolean;
  html: string;
  screenshot: string | null;
  loadedIn: number;
  error?: string;
}

export async function crawlPage(
  browserBinding: Fetcher,
  url: string,
  config?: CrawlConfig | null,
  takeScreenshot = false,
): Promise<CrawlResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const start = Date.now();

  let browser;
  try {
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();

    await page.setUserAgent(REALISTIC_UA);
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    } catch {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    }
    await page.waitForTimeout(cfg.waitFor);

    // Click spec/detail tabs to reveal hidden content (Samsung, etc.)
    try {
      await page.evaluate(() => {
        const keywords = ["스펙", "제품사양", "사양", "상세정보", "spec", "specification", "details"];
        const candidates = document.querySelectorAll("a, button, [role='tab'], li[class*='tab'], span[class*='tab']");
        for (const el of candidates) {
          const text = (el as HTMLElement).textContent?.trim().toLowerCase() || "";
          if (keywords.some((kw) => text === kw || text === kw + "s")) {
            (el as HTMLElement).click();
            break;
          }
        }
      });
      await page.waitForTimeout(2000);
    } catch {
      // tab click is best-effort
    }

    if (cfg.scrollToBottom) {
      let prevHeight = 0;
      for (let i = 0; i < 20; i++) {
        const height = await page.evaluate(
          "document.body.scrollHeight" as unknown as () => number,
        );
        if (height === prevHeight) break;
        prevHeight = height;
        await page.evaluate(
          "window.scrollTo(0, document.body.scrollHeight)" as unknown as () => void,
        );
        await page.waitForTimeout(cfg.scrollDelay);
      }
      await page.evaluate(
        "window.scrollTo(0, 0)" as unknown as () => void,
      );
    }

    const html = await page.content();

    let screenshot: string | null = null;
    if (takeScreenshot) {
      const buf = await page.screenshot({ fullPage: true, type: "png" });
      screenshot = Buffer.from(buf).toString("base64");
    }

    return { ok: true, html, screenshot, loadedIn: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      html: "",
      screenshot: null,
      loadedIn: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (browser) await browser.close();
  }
}
