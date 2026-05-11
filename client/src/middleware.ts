import {
  NextResponse,
} from "next/server";

import type {
  NextRequest,
} from "next/server";

export function middleware(
  request: NextRequest
) {

  const token =
    request.cookies.get(
      "flexchat_token"
    );

  const isAuthPage =
    request.nextUrl.pathname ===
    "/auth";

  const isChatPage =
    request.nextUrl.pathname.startsWith(
      "/chat"
    );

  if (
    !token &&
    isChatPage
  ) {

    return NextResponse.redirect(
      new URL(
        "/auth",
        request.url
      )
    );
  }

  if (
    token &&
    isAuthPage
  ) {

    return NextResponse.redirect(
      new URL(
        "/chat",
        request.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/auth",
  ],
};