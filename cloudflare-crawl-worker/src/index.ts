import { runPipeline } from "./orchestrator";
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
        const result = await runPipeline(env);
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
