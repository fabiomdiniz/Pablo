import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/spotify";

export async function GET() {
  const { url, verifier } = await getAuthorizationUrl();

  const response = NextResponse.redirect(url);

  // Set PKCE verifier on the response object (not via cookies())
  response.cookies.set("pablo_pkce_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
