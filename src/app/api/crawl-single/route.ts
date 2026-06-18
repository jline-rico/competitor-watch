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

  let endpoint: string;
  let fetchBody: string;

  if (body.catalog_mode && body.competitor_id) {
    endpoint = `/run?competitor_id=${body.competitor_id}`;
    fetchBody = "{}";
  } else if (body.research_mode) {
    endpoint = "/run-research";
    fetchBody = JSON.stringify(body);
  } else {
    endpoint = "/run-single";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${workerUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": workerToken,
    },
    body: fetchBody,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
