import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    const url = new URL("/?error=spotify_auth_denied", request.url);
    return NextResponse.redirect(url);
  }

  if (!code) {
    const url = new URL("/?error=missing_code", request.url);
    return NextResponse.redirect(url);
  }

  try {
    // Get the PKCE verifier from the login cookie
    const cookieStore = cookies();
    const verifierCookie = cookieStore.get("pablo_pkce_verifier");

    if (!verifierCookie?.value) {
      const url = new URL("/?error=pkce_expired", request.url);
      return NextResponse.redirect(url);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, verifierCookie.value);

    // Store tokens in a persistent cookie
    const tokenData = JSON.stringify(tokens);

    // Build response and set cookies ON the response object
    const url = new URL("/", request.url);
    const response = NextResponse.redirect(url);

    response.cookies.set("pablo_spotify_tokens", tokenData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    response.cookies.set("pablo_pkce_verifier", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    // Also update in-memory cache
    const { setUserTokenCache } = await import("@/lib/spotify");
    setUserTokenCache(tokens);

    console.log("[Auth] Token exchange successful, redirecting to /");
    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Token exchange failed";
    console.error("Callback error:", message);
    const url = new URL(
      `/?error=auth_failed&message=${encodeURIComponent(message)}`,
      request.url
    );
    return NextResponse.redirect(url);
  }
}
