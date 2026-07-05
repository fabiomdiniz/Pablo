import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getUserTokenCache } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken(request.cookies);
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
