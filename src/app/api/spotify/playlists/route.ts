import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET() {
  try {
    const token = await getAccessToken();

    // Get current user's ID
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      throw new Error(`Failed to fetch user profile: ${meRes.status}`);
    }
    const meData = await meRes.json();
    const userId: string = meData.id;

    // Fetch user's playlists (paginated, up to 200)
    let allPlaylists: {
      id: string;
      name: string;
      images: { url: string }[];
      owner: { id: string };
    }[] = [];

    let url: string | null =
      "https://api.spotify.com/v1/me/playlists?limit=50";

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Failed to fetch playlists: ${res.status} ${body}`);
      }

      const data = await res.json();
      allPlaylists = allPlaylists.concat(data.items);
      url = data.next;

      if (allPlaylists.length >= 200) break;
    }

    // Filter to only playlists owned by the user, sorted by name
    const owned = allPlaylists
      .filter((p) => p.owner.id === userId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.images?.[0]?.url ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ playlists: owned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
