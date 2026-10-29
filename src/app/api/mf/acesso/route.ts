import { NextResponse } from "next/server";
import { MF_COOKIE } from "@/proxy";

const safeNext = (value: string) => (value.startsWith("/mf") && !value.startsWith("//") ? value : "/mf");

export async function POST(request: Request) {
  const form = await request.formData();
  const next = safeNext(String(form.get("next") ?? "/mf"));
  const code = String(form.get("code") ?? "");
  const expected = process.env.MF_ACCESS_CODE;

  if (!expected || code !== expected) {
    const retry = new URL("/mf/acesso", request.url);
    retry.searchParams.set("next", next);
    retry.searchParams.set("erro", "1");
    return NextResponse.redirect(retry, 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(MF_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
