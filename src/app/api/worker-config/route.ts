import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    url: process.env.CRAWL_WORKER_URL || "",
    token: process.env.CRAWL_WORKER_AUTH_TOKEN || "",
  });
}
