import { NextResponse } from "next/server";
import { extractPlaylistId, getPlaylistTracksAll, filterPlayable } from "@/lib/spotify";
import type { GameTrack } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { urls }: { urls: string[] } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one playlist URL or ID." },
        { status: 400 }
      );
    }

    // Extract IDs and validate
    const playlistIds: string[] = [];
    for (const url of urls) {
      const id = extractPlaylistId(url.trim());
      if (!id) {
        return NextResponse.json(
          { error: `Invalid playlist URL or ID: "${url}"` },
          { status: 400 }
        );
      }
      playlistIds.push(id);
    }

    // Fetch tracks from all playlists
    const allTracks: GameTrack[] = [];

    for (const playlistId of playlistIds) {
      const rawTracks = await getPlaylistTracksAll(playlistId);
      const playable = filterPlayable(rawTracks);
      allTracks.push(...playable);
    }

    if (allTracks.length === 0) {
      return NextResponse.json(
        {
          error:
            "No playable tracks found. All songs in these playlists lack a 30-second preview clip.",
        },
        { status: 404 }
      );
    }

    // Deduplicate by track ID
    const seen = new Set<string>();
    const unique = allTracks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    return NextResponse.json({ tracks: unique, total: unique.length });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Tracks API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
