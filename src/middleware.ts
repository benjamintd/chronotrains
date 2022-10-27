import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/",
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const authString = atob(authValue).toString();

    if (process.env.BASIC_AUTH && authString === process.env.BASIC_AUTH) {
      return NextResponse.next();
    }
  }
  url.pathname = "/api/auth";

  return NextResponse.rewrite(url);
}
