import { NextRequest } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const { id } = await context.params;
  const mediaId = encodeURIComponent(id);
  const response = await fetch(`${API_URL}/media/${mediaId}`, {
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    return new Response("Not found", {
      status: response.status || 404,
    });
  }

  const headers = new Headers({
    "Content-Type":
      response.headers.get("content-type") ??
      "application/octet-stream",
    "Cache-Control": "private, max-age=3600",
  });
  const contentLength = response.headers.get("content-length");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
