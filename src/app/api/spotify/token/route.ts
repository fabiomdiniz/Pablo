import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    const token = await getAccessToken(request.cookies);
    return NextResponse.json({ access_token: token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auth error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
