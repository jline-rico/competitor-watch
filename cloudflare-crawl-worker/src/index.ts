import { runPipeline, runSingle, runResearch } from "./orchestrator";
import type { Env } from "./supabase";

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

    if (url.pathname === "/health") {
      return Response.json({ ok: true, timestamp: new Date().toISOString() });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
