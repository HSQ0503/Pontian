import { NextResponse, type NextRequest } from "next/server";

export const MF_COOKIE = "mf_access";

// A shared access code keeps the MF workspace and its paid AI endpoints private.
// Without MF_ACCESS_CODE (local development) everything stays open.
export function proxy(request: NextRequest) {
  const code = process.env.MF_ACCESS_CODE;
  const { pathname, search } = request.nextUrl;
  if (!code || pathname === "/mf/acesso" || pathname === "/api/mf/acesso" || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }
  if (request.cookies.get(MF_COOKIE)?.value === code) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const login = new URL("/mf/acesso", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/mf/:path*", "/api/mf/:path*"],
};
