export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  AUTH_TOKEN: string;
  BROWSER: Fetcher;
}

export interface Competitor {
  id: string;
  name: string;
  catalog_url: string;
  country: string | null;
  crawl_config: CrawlConfig | null;
}

export interface CrawlConfig {
  waitFor?: number;
  scrollToBottom?: boolean;
  scrollDelay?: number;
}

export interface ExistingProduct {
  id: string;
  product_url: string | null;
}

export interface CrawlLog {
  competitor_id: string;
  catalog_crawl_ok: boolean;
  products_found: number;
  new_products: number;
  specs_extracted: number;
  specs_from_image: number;
  specs_failed: number;
  error_message: string | null;
  duration_ms: number;
  tokens_used: number;
}

export class SupabaseClient {
  constructor(
    private url: string,
    private key: string,
  ) {}

  async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...((options.headers as Record<string, string>) || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase ${res.status}: ${body}`);
    }
    return res.json();
  }

  async getActiveCompetitors(): Promise<Competitor[]> {
    return this.request(
      "competitors?is_active=eq.true&deleted_at=is.null&select=id,name,catalog_url,country,crawl_config",
    ) as Promise<Competitor[]>;
  }

  async getAllCompetitors(): Promise<Competitor[]> {
    return this.request(
      "competitors?deleted_at=is.null&select=id,name,catalog_url,country,crawl_config",
    ) as Promise<Competitor[]>;
  }

  async getExistingProducts(competitorId: string): Promise<ExistingProduct[]> {
    return this.request(`products?competitor_id=eq.${competitorId}&select=id,product_url`) as Promise<ExistingProduct[]>;
  }

  async insertProduct(product: Record<string, unknown>): Promise<{ id: string }[]> {
    return this.request("products", {
      method: "POST",
      body: JSON.stringify(product),
    }) as Promise<{ id: string }[]>;
  }

  async findExistingProduct(
    competitorId: string,
    productUrl: string,
    modelNumber: string | null,
  ): Promise<{ id: string; specs_source: string | null } | null> {
    // Match by URL first
    const byUrl = await this.request(
      `products?competitor_id=eq.${competitorId}&product_url=eq.${encodeURIComponent(productUrl)}&select=id,specs_source&order=updated_at.asc`,
    ) as { id: string; specs_source: string | null }[];

    // Match by model_number
    let byModel: { id: string; specs_source: string | null }[] = [];
    if (modelNumber) {
      byModel = await this.request(
        `products?competitor_id=eq.${competitorId}&model_number=eq.${encodeURIComponent(modelNumber)}&select=id,specs_source&order=updated_at.asc`,
      ) as { id: string; specs_source: string | null }[];
    }

    // Merge all matches, deduplicate by id
    const seen = new Set<string>();
    const allMatches: { id: string; specs_source: string | null }[] = [];
    for (const p of [...byUrl, ...byModel]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        allMatches.push(p);
      }
    }

    if (allMatches.length === 0) return null;
    if (allMatches.length === 1) return allMatches[0];

    // Auto-merge duplicates: keep the oldest, move specs from others
    const keeper = allMatches[0];
    const duplicates = allMatches.slice(1);

    for (const dup of duplicates) {
      // Move specs to keeper (skip if field_key already exists)
      const dupSpecs = await this.request(
        `specs?product_id=eq.${dup.id}&select=id,field_key,field_label,value,source`,
      ) as { id: string; field_key: string; field_label: string; value: string; source: string }[];
      const keeperSpecs = await this.request(
        `specs?product_id=eq.${keeper.id}&select=field_key`,
      ) as { field_key: string }[];
      const keeperKeys = new Set(keeperSpecs.map((s) => s.field_key));

      for (const spec of dupSpecs) {
        if (!keeperKeys.has(spec.field_key)) {
          await this.request(`specs?id=eq.${spec.id}`, {
            method: "PATCH",
            body: JSON.stringify({ product_id: keeper.id }),
          });
        } else {
          await this.request(`specs?id=eq.${spec.id}`, { method: "DELETE" });
        }
      }

      // Delete the duplicate product
      await this.request(`products?id=eq.${dup.id}`, { method: "DELETE" });
    }

    return keeper;
  }

  async getExistingSpecs(productId: string): Promise<{ field_key: string }[]> {
    return this.request(
      `specs?product_id=eq.${productId}&select=field_key`,
    ) as Promise<{ field_key: string }[]>;
  }

  async insertSpecs(specs: Record<string, unknown>[]): Promise<void> {
    if (specs.length === 0) return;
    await this.request("specs", {
      method: "POST",
      body: JSON.stringify(specs),
    });
  }

  async getExistingFieldKeys(): Promise<{ field_key: string; field_label: string; category: string }[]> {
    return this.request(
      "spec_fields?select=field_key,field_label,category",
    ) as Promise<{ field_key: string; field_label: string; category: string }[]>;
  }

  async insertCrawlLog(log: CrawlLog): Promise<void> {
    await this.request("crawl_logs", {
      method: "POST",
      body: JSON.stringify(log),
    });
  }

  async getSuccessfulThisWeek(): Promise<string[]> {
    const monday = getThisMonday();
    const rows = await this.request(
      `crawl_logs?run_at=gte.${monday}&catalog_crawl_ok=eq.true&error_message=is.null&select=competitor_id`,
    ) as { competitor_id: string }[];
    return rows.map((r) => r.competitor_id);
  }
}

function getThisMonday(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}
