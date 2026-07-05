import type { DeezerTrack, GameTrack, MusicSource } from "./types";

/* ── Deezer auth helpers ── */

const DEEZER_APP_ID = process.env.DEEZER_APP_ID!;
const DEEZER_SECRET = process.env.DEEZER_SECRET!;
const DEEZER_REDIRECT_URI =
  process.env.DEEZER_REDIRECT_URI || "http://127.0.0.1:3000/api/deezer/callback";

export function getDeezerAuthUrl(): string {
  const params = new URLSearchParams({
    app_id: DEEZER_APP_ID,
    redirect_uri: DEEZER_REDIRECT_URI,
    perms: "basic_access,manage_library",
  });
  return `https://connect.deezer.com/oauth/auth.php?${params.toString()}`;
}

/* ── Deezer token management ── */

interface DeezerTokens {
  access_token: string;
  expires_at: number;
}

const DEEZER_COOKIE = "pablo_deezer_token";

export function getDeezerTokenFromCookies(
  requestCookies?: { get: (name: string) => { value: string } | undefined }
): string | null {
  try {
    const raw = requestCookies?.get(DEEZER_COOKIE)?.value;
    if (!raw) return null;
    const tokens: DeezerTokens = JSON.parse(raw);
    if (Date.now() < tokens.expires_at - 60_000) {
      return tokens.access_token;
    }
  } catch {
    return null;
  }
  return null;
}

export async function exchangeDeezerCode(code: string): Promise<DeezerTokens> {
  const params = new URLSearchParams({
    app_id: DEEZER_APP_ID,
    secret: DEEZER_SECRET,
    code,
    output: "json",
  });

  const res = await fetch(`https://connect.deezer.com/oauth/access_token.php?${params.toString()}`);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Deezer token exchange failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  // Deezer returns access_token with expires in seconds (default 0 = no expiry)
  const expiresIn = data.expires || 86400; // default 24h if not specified
  return {
    access_token: data.access_token,
    expires_at: Date.now() + expiresIn * 1000,
  };
}

/* ── Deezer API client ── */

async function deezerFetch(url: string) {
  console.log("[Deezer] Fetching:", url);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error("[Deezer] Error", res.status, body.slice(0, 500));
    if (res.status === 404) {
      throw new Error("Deezer playlist not found. Check the URL and try again.");
    }
    throw new Error(`Deezer API error ${res.status}: ${body}`);
  }
  return res.json();
}

/* ── Extract Deezer playlist ID ── */

const DEEZER_URL_RE = /deezer\.com\/(?:[a-z]{2}\/)?playlist\/(\d+)/;

export function extractDeezerPlaylistId(input: string): number | null {
  // Plain numeric ID
  if (/^\d+$/.test(input.trim())) {
    return parseInt(input.trim(), 10);
  }
  const match = input.match(DEEZER_URL_RE);
  return match ? parseInt(match[1], 10) : null;
}

/* ── Fetch playlist tracks (public — no auth needed) ── */

export async function getDeezerPlaylistTracks(playlistId: number): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = [];
  let url: string | null = `https://api.deezer.com/playlist/${playlistId}/tracks?limit=100`;

  while (url) {
    const data = await deezerFetch(url);
    if (Array.isArray(data.data)) {
      tracks.push(...data.data);
    }
    url = data.next || null;
    if (tracks.length >= 500) break;
  }

  // Enrich with release dates from iTunes (more accurate than Deezer albums)
  await enrichWithReleaseDates(tracks);

  return tracks;
}

/* ── Fetch release dates from iTunes Search API ── */

async function itunesFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes error: ${res.status}`);
  return res.json();
}

async function enrichWithReleaseDates(tracks: DeezerTrack[]): Promise<void> {
  const toFetch = tracks.filter((t) => !t.release_date);
  if (toFetch.length === 0) return;

  // Batch in groups of 5 parallel requests
  for (let i = 0; i < toFetch.length; i += 5) {
    const batch = toFetch.slice(i, i + 5);
    await Promise.allSettled(
      batch.map(async (track) => {
        try {
          // Clean up title: remove featured artists to improve match
          const cleanTitle = track.title
            .replace(/\s*\(feat[^)]*\)/gi, "")
            .replace(/\s*feat\.?\s+.*$/gi, "")
            .replace(/\s*featuring\s+.*$/gi, "")
            .trim();

          // Try cleaned title first, then original as fallback
          const queries = [cleanTitle, track.title]
            .filter((t) => t.length > 0)
            .filter((t, i, arr) => arr.indexOf(t) === i) // unique
            .map((t) => `${track.artist.name} ${t}`);

          for (const q of queries) {
            const data = await itunesFetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=5&media=music`
            );
            const match = data.results?.find((r: { releaseDate?: string }) => r.releaseDate);
            if (match) {
              track.release_date = match.releaseDate;
              break;
            }
          }
        } catch { /* skip */ }
      })
    );
  }

  // Fallback: for tracks still without dates, try Deezer album
  const stillMissing = tracks.filter((t) => !t.release_date);
  if (stillMissing.length > 0) {
    const albumIds = [...new Set(stillMissing.map((t) => t.album?.id).filter(Boolean))];
    const albumDates = new Map<number, string>();
    for (let i = 0; i < albumIds.length; i += 10) {
      const batch = albumIds.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(async (id) => {
          const a = await deezerFetch(`https://api.deezer.com/album/${id}`);
          if (a.release_date) albumDates.set(id, a.release_date);
        })
      );
      void results;
    }
    for (const track of stillMissing) {
      if (track.album?.id && albumDates.has(track.album.id)) {
        track.release_date = albumDates.get(track.album.id);
      }
    }
  }
}

/* ── Fetch user's playlists (needs auth) ── */

export async function getDeezerUserPlaylists(token: string): Promise<{
  id: number;
  title: string;
  picture_medium: string;
}[]> {
  const all: { id: number; title: string; picture_medium: string }[] = [];
  let url: string | null = `https://api.deezer.com/user/me/playlists?access_token=${token}&limit=100`;

  while (url) {
    const data = await deezerFetch(url);
    all.push(...data.data);
    url = data.next || null;
    if (all.length >= 200) break;
  }

  return all;
}

/* ── Convert Deezer track → GameTrack ── */

export function deezerToGameTrack(track: DeezerTrack): GameTrack {
  return {
    id: `dz_${track.id}`,
    uri: `deezer:track:${track.id}`,
    title: track.title,
    artist: track.artist.name,
    durationMs: track.duration * 1000,
    releaseDate: track.release_date ? track.release_date.slice(0, 4) : "",
    releaseYear: track.release_date ? track.release_date.slice(0, 4) : "—",
    albumArt: track.album.cover_medium,
    previewUrl: track.preview,
    source: "deezer",
  };
}
