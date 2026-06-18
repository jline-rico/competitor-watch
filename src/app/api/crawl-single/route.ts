import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const workerUrl = process.env.CRAWL_WORKER_URL;
  const workerToken = process.env.CRAWL_WORKER_AUTH_TOKEN;

  if (!workerUrl || !workerToken) {
    return NextResponse.json(
      { error: "Crawl worker not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const endpoint = body.research_mode ? "/run-research" : "/run-single";

  const res = await fetch(`${workerUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": workerToken,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
