import { crawlPage } from "./crawler";
import {
  extractCatalogList,
  extractProductSpecs,
  extractSpecsFromImage,
} from "./gemini";
import { trimHtml, hasProductLinks } from "./html-trimmer";
import type { Env, Competitor, CrawlLog } from "./supabase";
import { SupabaseClient } from "./supabase";

const SPEC_THRESHOLD = 3;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
      }
    }
  }
  throw lastError;
}

function getBaseUrl(catalogUrl: string): string {
  const u = new URL(catalogUrl);
  return `${u.protocol}//${u.host}`;
}

async function processCompetitor(
  env: Env,
  db: SupabaseClient,
  competitor: Competitor,
): Promise<CrawlLog> {
  const start = Date.now();
  const log: CrawlLog = {
    competitor_id: competitor.id,
    catalog_crawl_ok: false,
    products_found: 0,
    new_products: 0,
    specs_extracted: 0,
    specs_from_image: 0,
    specs_failed: 0,
    error_message: null,
    duration_ms: 0,
  };

  try {
    // Step 1: Crawl catalog page
    const catalogResult = await withRetry(() =>
      crawlPage(env.BROWSER, competitor.catalog_url, competitor.crawl_config),
    );

    if (!catalogResult.ok) {
      log.error_message = `Catalog crawl failed: ${catalogResult.error}`;
      return log;
    }

    log.catalog_crawl_ok = true;
    const trimmed = trimHtml(catalogResult.html);

    // Step 2: Validate HTML has product content
    if (!hasProductLinks(trimmed)) {
      log.error_message =
        "No product links found in catalog HTML - skipping Gemini call";
      return log;
    }

    // Step 3: Extract product list via Gemini
    const baseUrl = getBaseUrl(competitor.catalog_url);
    const catalogProducts = await withRetry(() =>
      extractCatalogList(
        env.GEMINI_API_KEY,
        trimmed,
        competitor.name,
        baseUrl,
      ),
    );
    log.products_found = catalogProducts.length;

    if (catalogProducts.length === 0) return log;

    // Step 4: Diff with existing products
    const existing = await db.getExistingProducts(competitor.id);
    const existingUrls = new Set(existing.map((p) => p.product_url));
    const newProducts = catalogProducts.filter((p) => !existingUrls.has(p.url));
    log.new_products = newProducts.length;

    if (newProducts.length === 0) return log;

    // Step 5: Process each new product
    for (const product of newProducts) {
      try {
        const detailResult = await withRetry(() =>
          crawlPage(env.BROWSER, product.url, { waitFor: 5000 }),
        );

        if (!detailResult.ok) {
          log.specs_failed++;
          continue;
        }

        const detailTrimmed = trimHtml(detailResult.html);

        // Try text extraction first
        let extracted = await withRetry(() =>
          extractProductSpecs(env.GEMINI_API_KEY, detailTrimmed),
        );

        let specsSource = "official_text";

        // Image fallback if too few specs
        if (!extracted || extracted.specs.length < SPEC_THRESHOLD) {
          const ssResult = await crawlPage(
            env.BROWSER,
            product.url,
            { waitFor: 3000 },
            true,
          );

          if (ssResult.ok && ssResult.screenshot) {
            const visionResult = await withRetry(() =>
              extractSpecsFromImage(env.GEMINI_API_KEY, ssResult.screenshot!),
            );

            if (
              visionResult &&
              visionResult.specs.length > (extracted?.specs.length || 0)
            ) {
              extracted = visionResult;
              specsSource = "official_image";
              log.specs_from_image++;
            }
          }
        }

        if (!extracted) {
          log.specs_failed++;
          continue;
        }

        // Save product
        const [saved] = await db.insertProduct({
          name: extracted.name || product.name,
          model_number: extracted.model || null,
          category: extracted.category || "기타",
          product_url: product.url,
          image_url: extracted.image_url || null,
          price: extracted.price || null,
          currency:
            extracted.currency ||
            (competitor.country === "한국" ? "KRW" : "USD"),
          country: competitor.country || null,
          competitor_id: competitor.id,
          source_type: "monitored",
          specs_source: specsSource,
        });

        // Save specs
        if (saved && extracted.specs.length > 0) {
          const specs = extracted.specs.map((s) => ({
            product_id: saved.id,
            field_key: s.key || s.label.toLowerCase().replace(/\s+/g, "_"),
            field_label: s.label,
            value: String(s.value),
            source: "official",
          }));
          await db.insertSpecs(specs);
          log.specs_extracted += specs.length;
        }
      } catch {
        log.specs_failed++;
      }
    }
  } catch (err) {
    log.error_message = err instanceof Error ? err.message : String(err);
  } finally {
    log.duration_ms = Date.now() - start;
  }

  return log;
}

export async function runPipeline(
  env: Env,
): Promise<{ logs: CrawlLog[] }> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const competitors = await db.getActiveCompetitors();
  const doneThisWeek = new Set(await db.getSuccessfulThisWeek());

  const logs: CrawlLog[] = [];

  for (const competitor of competitors) {
    if (doneThisWeek.has(competitor.id)) continue;
    const log = await processCompetitor(env, db, competitor);
    await db.insertCrawlLog(log);
    logs.push(log);
  }

  return { logs };
}
