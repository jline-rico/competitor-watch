import { runPipeline, runSingle, runResearch } from "./orchestrator";
import { normalizeFieldKeys, resetTokensUsed, getTokensUsed } from "./gemini";
import type { Env } from "./supabase";
import { SupabaseClient } from "./supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
};

function corsJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const token = request.headers.get("X-Auth-Token");
    if (token !== env.AUTH_TOKEN) {
      return new Response("Unauthorized", { status: 403, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/run" && request.method === "POST") {
      try {
        const competitorId = url.searchParams.get("competitor_id");
        const result = await runPipeline(env, competitorId);
        return corsJson(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return corsJson({ error: message }, 500);
      }
    }

    if (url.pathname === "/run-single" && request.method === "POST") {
      try {
        const body = await request.json() as {
          competitor_name: string;
          product_url: string;
          country?: string | null;
          competitor_id?: string | null;
        };
        if (!body.product_url || !body.competitor_name) {
          return corsJson(
            { error: "competitor_name and product_url are required" },
            400,
          );
        }
        const result = await runSingle(env, body);
        return corsJson(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return corsJson({ error: message }, 500);
      }
    }

    if (url.pathname === "/run-research" && request.method === "POST") {
      try {
        const body = await request.json() as {
          competitor_name: string;
          product_name: string;
          model_number?: string | null;
          country?: string | null;
          product_id: string;
        };
        if (!body.product_name || !body.competitor_name || !body.product_id) {
          return corsJson(
            { error: "competitor_name, product_name, and product_id are required" },
            400,
          );
        }
        const result = await runResearch(env, body);
        return corsJson(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return corsJson({ error: message }, 500);
      }
    }

    if (url.pathname === "/normalize-specs" && request.method === "POST") {
      try {
        resetTokensUsed();
        const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        const categoryFilter = url.searchParams.get("category") || "도어락";

        const rows = await db.request(
          `specs?select=field_key,field_label,product:products!inner(category)&product.category=eq.${encodeURIComponent(categoryFilter)}&order=field_key`
        ) as { field_key: string; field_label: string }[];

        const uniqueKeys = [...new Set(rows.map((r) => `${r.field_key}|${r.field_label}`))];
        const mappings = await normalizeFieldKeys(env.GEMINI_API_KEY, categoryFilter, uniqueKeys);

        const sqlStatements: string[] = [];
        for (const m of mappings) {
          if (m.old_key !== m.new_key) {
            const eo = m.old_key.replace(/'/g, "''");
            const en = m.new_key.replace(/'/g, "''");
            const el = m.new_label.replace(/'/g, "''");
            sqlStatements.push(`UPDATE specs SET field_key = '${en}', field_label = '${el}' WHERE field_key = '${eo}';`);
          }
        }

        return Response.json({
          ok: true,
          category: categoryFilter,
          unique_keys_found: uniqueKeys.length,
          mappings_count: mappings.length,
          mappings,
          sql: sqlStatements.join("\n"),
          tokens_used: getTokensUsed(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return corsJson({ error: message }, 500);
      }
    }

    if (url.pathname === "/health") {
      return corsJson({ ok: true, timestamp: new Date().toISOString() });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
} satisfies ExportedHandler<Env>;
