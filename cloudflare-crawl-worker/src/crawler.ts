import puppeteer from "@cloudflare/puppeteer";
import type { CrawlConfig } from "./supabase";

const DEFAULT_CONFIG: Required<CrawlConfig> = {
  waitFor: 5000,
  scrollToBottom: false,
  scrollDelay: 1000,
};

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

    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForTimeout(cfg.waitFor);

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
