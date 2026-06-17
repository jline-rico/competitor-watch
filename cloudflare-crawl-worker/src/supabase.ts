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
}

export class SupabaseClient {
  constructor(
    private url: string,
    private key: string,
  ) {}

  private async request(path: string, options: RequestInit = {}) {
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

  async getExistingProducts(competitorId: string): Promise<ExistingProduct[]> {
    return this.request(`products?competitor_id=eq.${competitorId}&select=id,product_url`) as Promise<ExistingProduct[]>;
  }

  async insertProduct(product: Record<string, unknown>): Promise<{ id: string }[]> {
    return this.request("products", {
      method: "POST",
      body: JSON.stringify(product),
    }) as Promise<{ id: string }[]>;
  }

  async insertSpecs(specs: Record<string, unknown>[]): Promise<void> {
    if (specs.length === 0) return;
    await this.request("specs", {
      method: "POST",
      body: JSON.stringify(specs),
    });
  }

  async insertCrawlLog(log: CrawlLog): Promise<void> {
    await this.request("crawl_logs", {
      method: "POST",
      body: JSON.stringify(log),
    });
  }
}
