import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify";

function getBaseUrl(request: NextRequest): string {
  if (process.env.NODE_ENV === "production") {
    return new URL("/", request.url).origin;
  }
  return "http://127.0.0.1:3000";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = getBaseUrl(request);

  if (error) {
    return NextResponse.redirect(new URL("/?error=spotify_auth_denied", base));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", base));
  }

  try {
    // Use request.cookies instead of cookies() from next/headers
    const verifier = request.cookies.get("pablo_pkce_verifier")?.value;

    if (!verifier) {
      return NextResponse.redirect(new URL("/?error=pkce_expired", base));
    }

    const tokens = await exchangeCodeForTokens(code, verifier);
    const tokenData = JSON.stringify(tokens);

    const response = NextResponse.redirect(new URL("/", base));

    response.cookies.set("pablo_spotify_tokens", tokenData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    response.cookies.delete("pablo_pkce_verifier");

    const { setUserTokenCache } = await import("@/lib/spotify");
    setUserTokenCache(tokens);

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    console.error("Callback error:", message);
    return NextResponse.redirect(
      new URL(`/?error=auth_failed&message=${encodeURIComponent(message)}`, base)
    );
  }
}
