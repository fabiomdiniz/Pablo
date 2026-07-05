import { NextRequest, NextResponse } from "next/server";
import { getDeezerTokenFromCookies } from "@/lib/deezer";

export async function GET(request: NextRequest) {
  const token = getDeezerTokenFromCookies(request.cookies);
  return NextResponse.json({ authenticated: !!token });
}
