import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_BACKEND_URL = "http://localhost:5000";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getBackendUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    DEFAULT_BACKEND_URL
  ).replace(/\/$/, "");
}

function buildTargetUrl(path: string[], request: NextRequest) {
  const targetUrl = new URL(
    `${getBackendUrl()}/${path.map(encodeURIComponent).join("/")}`,
  );

  targetUrl.search = request.nextUrl.search;

  return targetUrl;
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    headers.set(key, value);
  });

  return headers;
}

async function proxyBackendRequest(
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  },
) {
  const { path = [] } = await context.params;
  const targetUrl = buildTargetUrl(path, request);
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  console.info("[AUTH] backend proxy request", {
    method,
    path: `/${path.join("/")}`,
    hasAuthorization: request.headers.has("authorization"),
  });

  const response = await fetch(targetUrl, {
    method,
    headers: buildForwardHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers();

  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    responseHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  },
) {
  return proxyBackendRequest(request, context);
}

export function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  },
) {
  return proxyBackendRequest(request, context);
}

export function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  },
) {
  return proxyBackendRequest(request, context);
}

export function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  },
) {
  return proxyBackendRequest(request, context);
}

export function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      path?: string[];
    }>;
  },
) {
  return proxyBackendRequest(request, context);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
  });
}
