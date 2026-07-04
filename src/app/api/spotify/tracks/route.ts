import { NextResponse } from "next/server";
import {
  extractPlaylistId,
  getPlaylistTracksAll,
  toGameTracks,
  getUserTokenCache,
  setUserTokenCache,
} from "@/lib/spotify";
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
    let totalFetched = 0;

    for (const playlistId of playlistIds) {
      const rawTracks = await getPlaylistTracksAll(playlistId);
      totalFetched += rawTracks.length;
      const playable = toGameTracks(rawTracks);
      allTracks.push(...playable);
    }

    if (allTracks.length === 0) {
      return NextResponse.json(
        {
          error:
            `No playable tracks found. Fetched ${totalFetched} tracks total, ` +
            `but none have a 30-second Spotify preview clip. ` +
            `Try a playlist with more popular/mainstream songs.`,
        },
        { status: 404 }
      );
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = allTracks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // Persist refreshed tokens if they were updated
    const refreshedTokens = getUserTokenCache();
    const response = NextResponse.json({ tracks: unique, total: unique.length });

    if (refreshedTokens) {
      response.cookies.set("pablo_spotify_tokens", JSON.stringify(refreshedTokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      setUserTokenCache(null);
    }

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Tracks API error:", message);

    // If the error is about authentication, return 401 so the frontend can show login
    if (message.includes("Not authenticated") || message.includes("log in")) {
      return NextResponse.json({ error: message, needsAuth: true }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
