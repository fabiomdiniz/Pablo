import { NextRequest, NextResponse } from "next/server";
import { getDeezerTokenFromCookies, getDeezerUserPlaylists } from "@/lib/deezer";

async function deezerFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer error: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const token = getDeezerTokenFromCookies(request.cookies);

    if (token) {
      // Authenticated — show user's playlists
      const playlists = await getDeezerUserPlaylists(token);
      return NextResponse.json({
        playlists: playlists
          .map((p) => ({ id: `dz_${p.id}`, name: p.title, image: p.picture_medium }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // Not authenticated — show top Deezer playlists
    const data = await deezerFetch("https://api.deezer.com/chart/0/playlists?limit=20");
    return NextResponse.json({
      playlists: (data.data || []).map((p: { id: number; title: string; picture_medium: string }) => ({
        id: `dz_${p.id}`,
        name: p.title,
        image: p.picture_medium,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
