import { NextResponse } from "next/server";
import { extractDeezerPlaylistId, getDeezerPlaylistTracks, deezerToGameTrack } from "@/lib/deezer";
import type { GameTrack } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { urls }: { urls: string[] } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one Deezer playlist URL or ID." },
        { status: 400 }
      );
    }

    const playlistIds: number[] = [];
    for (const url of urls) {
      const id = extractDeezerPlaylistId(url.trim());
      if (!id) {
        return NextResponse.json(
          { error: `Invalid Deezer playlist URL or ID: "${url}"` },
          { status: 400 }
        );
      }
      playlistIds.push(id);
    }

    const allTracks: GameTrack[] = [];
    for (const pid of playlistIds) {
      const rawTracks = await getDeezerPlaylistTracks(pid);
      allTracks.push(...rawTracks.map(deezerToGameTrack));
    }

    // Filter to only tracks with a preview audio URL
    const playable = allTracks.filter((t) => t.previewUrl && t.previewUrl.length > 0);

    if (playable.length === 0) {
      const total = allTracks.length;
      return NextResponse.json(
        { error: `No playable tracks found. Fetched ${total} tracks, but none have a preview clip. Try another playlist.` },
        { status: 404 }
      );
    }

    const seen = new Set<string>();
    const unique = playable.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    return NextResponse.json({ tracks: unique, total: unique.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("Deezer tracks error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
