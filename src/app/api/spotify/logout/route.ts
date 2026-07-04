import { NextResponse } from "next/server";
import { setUserTokenCache } from "@/lib/spotify";

export async function GET() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("pablo_spotify_tokens", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  setUserTokenCache(null);
  return response;
}
