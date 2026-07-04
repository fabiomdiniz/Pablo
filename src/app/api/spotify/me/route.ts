import { NextResponse } from "next/server";
import { getTokensFromCookies, getUserTokenCache, setUserTokenCache } from "@/lib/spotify";

export async function GET() {
  // Check both cookie and in-memory cache
  const cookieTokens = getTokensFromCookies();
  const memTokens = getUserTokenCache();
  const tokens = cookieTokens ?? memTokens;

  if (!tokens) {
    return NextResponse.json({ authenticated: false });
  }

  if (Date.now() >= tokens.expires_at) {
    return NextResponse.json({
      authenticated: false,
      reason: "token_expired",
    });
  }

  return NextResponse.json({
    authenticated: true,
    expires_in_seconds: Math.floor((tokens.expires_at - Date.now()) / 1000),
  });
}
