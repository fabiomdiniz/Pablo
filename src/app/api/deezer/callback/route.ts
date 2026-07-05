import { NextRequest, NextResponse } from "next/server";
import { exchangeDeezerCode } from "@/lib/deezer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_reason");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=deezer_auth_denied", request.url));
  }

  try {
    const tokens = await exchangeDeezerCode(code);

    const response = NextResponse.redirect(new URL("/?source=deezer", request.url));
    response.cookies.set("pablo_deezer_token", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return NextResponse.redirect(
      new URL(`/?error=deezer_auth_failed&message=${encodeURIComponent(message)}`, request.url)
    );
  }
}
