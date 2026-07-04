import type { SpotifyTrack, PlaylistTracksResponse, GameTrack } from "./types";

/* ── Extract playlist ID from Spotify URL or URI ── */

const PLAYLIST_URL_RE =
  /(?:open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)/;

export function extractPlaylistId(input: string): string | null {
  // If it's already a plain ID (22 chars, alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) {
    return input.trim();
  }
  const match = input.match(PLAYLIST_URL_RE);
  return match ? match[1] : null;
}

/* ── Client Credentials token (called from API route) ── */

let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local"
    );
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(
      `Spotify auth failed: ${res.status} ${await res.text()}`
    );
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

/* ── Fetch all tracks from a playlist (paginated) ── */

async function spotifyFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getPlaylistTracks(
  playlistId: string
): Promise<PlaylistTracksResponse> {
  const token = await getAccessToken();
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,preview_url,album(name,images,release_date,release_date_precision),artists(name),duration_ms)),next,total&limit=100`;
  return spotifyFetch(url, token);
}

export async function getPlaylistTracksAll(
  playlistId: string
): Promise<SpotifyTrack[]> {
  const token = await getAccessToken();
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,preview_url,album(name,images,release_date,release_date_precision),artists(name),duration_ms)),next,total&limit=100`;

  const tracks: SpotifyTrack[] = [];

  while (url) {
    const data: PlaylistTracksResponse = await spotifyFetch(url, token);
    for (const item of data.items) {
      if (item.track) tracks.push(item.track);
    }
    url = data.next;
  }

  return tracks;
}

/* ── Convert to GameTrack (filter: must have preview_url) ── */

export function toGameTrack(track: SpotifyTrack): GameTrack {
  const releaseDate = track.album.release_date;
  const releaseYear =
    track.album.release_date_precision === "year"
      ? releaseDate
      : releaseDate.slice(0, 4);

  // Pick the 300x300 album art (Spotify images[1] is usually 300px)
  const albumArt =
    track.album.images.length > 0
      ? track.album.images[
          track.album.images.length > 1 ? 1 : 0
        ].url
      : "";

  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    previewUrl: track.preview_url!,
    releaseDate,
    releaseYear,
    albumArt,
  };
}

export function filterPlayable(tracks: SpotifyTrack[]): GameTrack[] {
  return tracks
    .filter((t) => t.preview_url != null)
    .map(toGameTrack);
}
