import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workerUrl = process.env.CRAWL_WORKER_URL;
  const workerToken = process.env.CRAWL_WORKER_AUTH_TOKEN;

  if (!workerUrl || !workerToken) {
    return NextResponse.json(
      { error: "Missing CRAWL_WORKER_URL or CRAWL_WORKER_AUTH_TOKEN" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${workerUrl}/run`, {
      method: "POST",
      headers: { "X-Auth-Token": workerToken },
      signal: AbortSignal.timeout(8000),
    });

    const triggered = res.ok;
    return NextResponse.json({
      triggered,
      status: res.status,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      triggered: true,
      note: "fire-and-forget: worker may still be running",
      timestamp: new Date().toISOString(),
    });
  }
}
