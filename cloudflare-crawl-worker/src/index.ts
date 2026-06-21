import { runPipeline, runSingle, runResearch } from "./orchestrator";
import { normalizeFieldKeys, resetTokensUsed, getTokensUsed } from "./gemini";
import type { Env } from "./supabase";
import { SupabaseClient } from "./supabase";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const token = request.headers.get("X-Auth-Token");
    if (token !== env.AUTH_TOKEN) {
      return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/run" && request.method === "POST") {
      try {
        const competitorId = url.searchParams.get("competitor_id");
        const result = await runPipeline(env, competitorId);
        return Response.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: message }, { status: 500 });
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
          return Response.json(
            { error: "competitor_name and product_url are required" },
            { status: 400 },
          );
        }
        const result = await runSingle(env, body);
        return Response.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: message }, { status: 500 });
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
          return Response.json(
            { error: "competitor_name, product_name, and product_id are required" },
            { status: 400 },
          );
        }
        const result = await runResearch(env, body);
        return Response.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: message }, { status: 500 });
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
        return Response.json({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, timestamp: new Date().toISOString() });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
