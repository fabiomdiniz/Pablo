import { cookies } from "next/headers";
import type { SpotifyTrack, PlaylistItemsResponse, GameTrack } from "./types";

/* ── Extract playlist ID from Spotify URL or URI ── */

const PLAYLIST_URL_RE =
  /(?:open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]+)/;

export function extractPlaylistId(input: string): string | null {
  if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) {
    return input.trim();
  }
  const match = input.match(PLAYLIST_URL_RE);
  return match ? match[1] : null;
}

/* ── Spotify auth helpers ── */

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ||
  "http://127.0.0.1:3000/api/spotify/callback";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const AUTH_URL = "https://accounts.spotify.com/authorize";

function basicAuth(): string {
  return "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
}

/* ── PKCE helpers ── */

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(hash));
}

function base64Url(bytes: Uint8Array): string {
  // Use Node's Buffer for base64, then make it URL-safe
  const b64 = Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ── Cookie-based token management ── */

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const COOKIE_NAME = "pablo_spotify_tokens";

export async function getAccessToken(
  requestCookies?: { get: (name: string) => { value: string } | undefined }
): Promise<string> {
  let tokens: StoredTokens | null = null;

  // Read from request cookies
  if (requestCookies) {
    try {
      const raw = requestCookies.get(COOKIE_NAME)?.value;
      if (raw) tokens = JSON.parse(raw) as StoredTokens;
    } catch { /* ignore */ }
  }

  // If we have a valid user token, use it
  if (tokens && Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token;
  }

  // If we have a refresh token, refresh it
  if (tokens?.refresh_token) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuth(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const newTokens: StoredTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? tokens.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      };
      // Note: cookie update happens via response headers in the API route.
      // For now we cache in-memory and the route handler will persist.
      userTokenCache = newTokens;
      return newTokens.access_token;
    }
  }

  throw new Error(
    "Not authenticated with Spotify. Please log in first."
  );
}

// In-memory fallback for refreshed tokens (routes should also set cookie)
let userTokenCache: StoredTokens | null = null;

export function getUserTokenCache(): StoredTokens | null {
  return userTokenCache;
}

export function setUserTokenCache(tokens: StoredTokens | null) {
  userTokenCache = tokens;
}

/* ── Authorization URL generator ── */

export async function getAuthorizationUrl(): Promise<{
  url: string;
  verifier: string;
}> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: "playlist-read-private playlist-read-collaborative streaming user-modify-playback-state user-read-playback-state",
    show_dialog: "true",
  });

  return { url: `${AUTH_URL}?${params.toString()}`, verifier };
}

/* ── Token exchange (code → tokens) ── */

export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<StoredTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

/* ── Fetch all tracks from a playlist (paginated) ── */

async function spotifyFetch(url: string, token: string) {
  console.log("[Spotify] Fetching:", url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[Spotify] Error", res.status, body.slice(0, 500));
    if (res.status === 401) {
      throw new Error(
        "Spotify session expired. Please log in again."
      );
    }
    if (res.status === 403) {
      throw new Error(
        "Cannot access this playlist. Spotify's Feb 2026 update limits " +
        "playlist access to playlists you own or collaborate on. " +
        "Try with one of your own playlists."
      );
    }
    if (res.status === 404) {
      throw new Error(
        "Playlist not found or not accessible. Spotify now only returns " +
        "track data for playlists you own or collaborate on. " +
        "Try with a playlist from your own library."
      );
    }
    throw new Error(`Spotify API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getPlaylistTracksAll(
  playlistId: string,
  cookies?: { get: (name: string) => { value: string } | undefined }
): Promise<SpotifyTrack[]> {
  const token = await getAccessToken(cookies);
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;

  const tracks: SpotifyTrack[] = [];

  while (url) {
    const data: PlaylistItemsResponse = await spotifyFetch(url, token);
    for (const entry of data.items) {
      if (entry.item) tracks.push(entry.item);
    }
    url = data.next;
  }

  return tracks;
}

/* ── Convert to GameTrack ── */

export function toGameTrack(track: SpotifyTrack): GameTrack {
  const releaseDate = track.album.release_date || "";
  const releaseYear =
    releaseDate
      ? track.album.release_date_precision === "year"
        ? releaseDate
        : releaseDate.slice(0, 4)
      : "—";

  const albumArt =
    track.album.images.length > 0
      ? track.album.images[track.album.images.length > 1 ? 1 : 0].url
      : "";

  return {
    id: track.id,
    uri: track.uri,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    durationMs: track.duration_ms,
    releaseDate,
    releaseYear,
    albumArt,
    previewUrl: "",
    source: "spotify" as const,
  };
}

export function toGameTracks(tracks: SpotifyTrack[]): GameTrack[] {
  return tracks.map(toGameTrack);
}
