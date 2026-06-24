import { NextResponse } from "next/server";

export const maxDuration = 60;

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

  const workerFetchUrl = `${workerUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Auth-Token": workerToken,
  };

  try {
    const res = await fetch(workerFetchUrl, {
      method: "POST",
      headers,
      body: fetchBody,
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: "크롤링 서버 응답 시간 초과. 잠시 후 다시 시도해주세요.",
    }, { status: 504 });
  }
}
