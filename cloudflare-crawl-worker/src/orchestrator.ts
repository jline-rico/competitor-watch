import { crawlPage } from "./crawler";
import {
  extractCatalogList,
  extractProductSpecs,
  extractSpecsFromImage,
  researchProductByName,
  getTokensUsed,
  resetTokensUsed,
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
  const tokensBefore = getTokensUsed();
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
    tokens_used: 0,
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
        `Catalog HTML too short after trimming (${trimmed.length} chars) - skipping Gemini call`;
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

    // Fetch existing field keys from DB for normalization
    const existingFieldKeys = await db.getExistingFieldKeys();

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
          extractProductSpecs(env.GEMINI_API_KEY, detailTrimmed, existingFieldKeys),
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
              extractSpecsFromImage(env.GEMINI_API_KEY, ssResult.screenshot!, existingFieldKeys),
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
    log.tokens_used = getTokensUsed() - tokensBefore;
  }

  return log;
}

export async function runSingle(
  env: Env,
  params: {
    competitor_name: string;
    product_url: string;
    country?: string | null;
    competitor_id?: string | null;
  },
): Promise<{ ok: boolean; product_id?: string; specs_count?: number; specs_source?: string; tokens_used?: number; error?: string; updated?: boolean; note?: string }> {
  resetTokensUsed();
  const start = Date.now();
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  // Resolve competitor first for logging
  let competitorId = params.competitor_id || null;
  if (!competitorId) {
    const competitors = await db.getAllCompetitors();
    const match = competitors.find(
      (c) => c.name.toLowerCase() === params.competitor_name.toLowerCase(),
    );
    competitorId = match?.id || null;
  }

  if (!competitorId) {
    return { ok: false, error: `Competitor "${params.competitor_name}" not found` };
  }

  const log: CrawlLog = {
    competitor_id: competitorId,
    catalog_crawl_ok: true,
    products_found: 1,
    new_products: 0,
    specs_extracted: 0,
    specs_from_image: 0,
    specs_failed: 0,
    error_message: null,
    duration_ms: 0,
    tokens_used: 0,
  };

  try {
    // Single crawl: get HTML + screenshot together, with scroll for lazy-loaded content
    const detailResult = await withRetry(() =>
      crawlPage(env.BROWSER, params.product_url, {
        waitFor: 5000,
        scrollToBottom: true,
        scrollDelay: 500,
      }, true),
    );

    if (!detailResult.ok) {
      log.catalog_crawl_ok = false;
      log.error_message = `Crawl failed: ${detailResult.error}`;
      log.specs_failed = 1;
      return { ok: false, error: log.error_message };
    }

    // Fetch existing field keys for normalization
    const existingFieldKeys = await db.getExistingFieldKeys();

    const detailTrimmed = trimHtml(detailResult.html);
    const textExtracted = await withRetry(() =>
      extractProductSpecs(env.GEMINI_API_KEY, detailTrimmed, existingFieldKeys),
    );
    let extracted = textExtracted;
    let specsSource = "official_text";

    if ((!extracted || extracted.specs.length < SPEC_THRESHOLD) && detailResult.screenshot) {
      const visionResult = await withRetry(() =>
        extractSpecsFromImage(env.GEMINI_API_KEY, detailResult.screenshot!, existingFieldKeys),
      );
      if (visionResult && visionResult.specs.length > (extracted?.specs.length || 0)) {
        extracted = visionResult;
        specsSource = "official_image";
        log.specs_from_image = 1;

        // Merge unique specs from text extraction
        if (textExtracted && textExtracted.specs.length > 0) {
          const imageKeys = new Set(extracted.specs.map((s) => s.key));
          const extraSpecs = textExtracted.specs.filter((s) => !imageKeys.has(s.key));
          if (extraSpecs.length > 0) {
            extracted.specs.push(...extraSpecs);
            specsSource = "official_mixed";
          }
        }
      }
    }

    if (!extracted) {
      log.specs_failed = 1;
      log.error_message = "Failed to extract specs from page";
      return { ok: false, error: log.error_message };
    }

    // Check if product already exists (same URL or model_number)
    const existing = await db.findExistingProduct(
      competitorId,
      params.product_url,
      extracted.model || null,
    );

    let productId: string;
    let isUpdate = false;

    if (existing) {
      productId = existing.id;
      isUpdate = true;
      await db.request(`products?id=eq.${productId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(extracted.name ? { name: extracted.name } : {}),
          ...(extracted.image_url ? { image_url: extracted.image_url } : {}),
          ...(extracted.price ? { price: extracted.price } : {}),
          ...(extracted.currency ? { currency: extracted.currency } : {}),
          specs_source: specsSource,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      const [saved] = await db.insertProduct({
        name: extracted.name || params.competitor_name,
        model_number: extracted.model || null,
        category: extracted.category || "기타",
        product_url: params.product_url,
        image_url: extracted.image_url || null,
        price: extracted.price || null,
        currency: extracted.currency || (params.country === "한국" ? "KRW" : "USD"),
        country: params.country || null,
        competitor_id: competitorId,
        source_type: "one_time",
        specs_source: specsSource,
      });
      productId = saved.id;
      log.new_products = 1;
    }

    if (extracted.specs.length > 0) {
      // Get existing specs to avoid duplicates
      const existingSpecs = isUpdate
        ? await db.getExistingSpecs(productId)
        : [];
      const existingKeys = new Set(existingSpecs.map((s) => s.field_key));

      const newSpecs = extracted.specs
        .map((s) => ({
          product_id: productId,
          field_key: s.key || s.label.toLowerCase().replace(/\s+/g, "_"),
          field_label: s.label,
          value: String(s.value),
          source: "official",
        }))
        .filter((s) => !existingKeys.has(s.field_key));

      if (newSpecs.length > 0) {
        await db.insertSpecs(newSpecs);
      }
      log.specs_extracted = newSpecs.length;
      const note = isUpdate
        ? `기존 제품 보완: +${newSpecs.length}개 스펙 추가 (기존 ${existingKeys.size}개)`
        : undefined;
      return { ok: true, product_id: productId, specs_count: newSpecs.length, specs_source: specsSource, tokens_used: getTokensUsed(), updated: isUpdate, note };
    }

    return { ok: true, product_id: productId, specs_count: 0, specs_source: specsSource, tokens_used: getTokensUsed(), updated: isUpdate };
  } catch (err) {
    log.error_message = err instanceof Error ? err.message : String(err);
    log.specs_failed = 1;
    return { ok: false, error: log.error_message, tokens_used: getTokensUsed() };
  } finally {
    log.duration_ms = Date.now() - start;
    log.tokens_used = getTokensUsed();
    await db.insertCrawlLog(log).catch(() => {});
  }
}

export async function runPipeline(
  env: Env,
  competitorId?: string | null,
): Promise<{ logs: CrawlLog[]; tokens_used: number }> {
  resetTokensUsed();
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const allCompetitors = await db.getActiveCompetitors();
  const competitors = competitorId
    ? allCompetitors.filter((c) => c.id === competitorId)
    : allCompetitors;
  const doneThisWeek = new Set(await db.getSuccessfulThisWeek());

  const logs: CrawlLog[] = [];

  for (const competitor of competitors) {
    if (doneThisWeek.has(competitor.id)) continue;
    const log = await processCompetitor(env, db, competitor);
    await db.insertCrawlLog(log);
    logs.push(log);
  }

  return { logs, tokens_used: getTokensUsed() };
}

export async function runResearch(
  env: Env,
  params: {
    competitor_name: string;
    product_name: string;
    model_number?: string | null;
    country?: string | null;
    product_id: string;
  },
): Promise<{ ok: boolean; specs_count?: number; tokens_used?: number; error?: string }> {
  resetTokensUsed();
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  try {
    await db.request(`products?id=eq.${params.product_id}`, {
      method: "PATCH",
      body: JSON.stringify({ ai_research_status: "running" }),
    });

    const existingSpecs = await db.request(
      `specs?product_id=eq.${params.product_id}&select=id,field_key,field_label,value`
    ) as { id: string; field_key: string; field_label: string; value: string }[];

    const emptySpecs = existingSpecs.filter((s) => !s.value || s.value.trim() === "");

    const product = await db.request(
      `products?id=eq.${params.product_id}&select=price,currency`
    ) as { price: number | null; currency: string | null }[];
    const needsPrice = !product[0]?.price;

    const searchName = params.model_number
      ? `${params.product_name} (${params.model_number})`
      : params.product_name;

    const result = await withRetry(() =>
      researchProductByName(
        env.GEMINI_API_KEY,
        searchName,
        params.competitor_name,
        emptySpecs.map((s) => ({ key: s.field_key, label: s.field_label })),
        needsPrice,
      ),
    );

    if (!result) {
      await db.request(`products?id=eq.${params.product_id}`, {
        method: "PATCH",
        body: JSON.stringify({ ai_research_status: "failed" }),
      });
      return { ok: false, error: "No results from research" };
    }

    let filledCount = 0;
    for (const emptySpec of emptySpecs) {
      const match = result.specs.find(
        (s) => s.key === emptySpec.field_key || s.label === emptySpec.field_label,
      );
      if (match && match.value) {
        await db.request(`specs?id=eq.${emptySpec.id}`, {
          method: "PATCH",
          body: JSON.stringify({ value: String(match.value), source: "researched" }),
        });
        filledCount++;
      }
    }

    const productUpdate: Record<string, unknown> = { ai_research_status: "done" };
    if (needsPrice && result.price) {
      productUpdate.price = result.price;
      if (result.currency) productUpdate.currency = result.currency;
    }
    await db.request(`products?id=eq.${params.product_id}`, {
      method: "PATCH",
      body: JSON.stringify(productUpdate),
    });

    return { ok: true, specs_count: filledCount, tokens_used: getTokensUsed() };
  } catch (err) {
    await db.request(`products?id=eq.${params.product_id}`, {
      method: "PATCH",
      body: JSON.stringify({ ai_research_status: "failed" }),
    }).catch(() => {});
    return { ok: false, error: err instanceof Error ? err.message : String(err), tokens_used: getTokensUsed() };
  }
}
