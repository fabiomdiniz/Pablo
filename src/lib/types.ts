/* ── Spotify API response shapes ── */

export interface SpotifyTrack {
  id: string;
  name: string;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
    release_date: string;
    release_date_precision: "year" | "month" | "day";
  };
  artists: { name: string; id: string }[];
  duration_ms: number;
}

export interface PlaylistTracksResponse {
  items: {
    track: SpotifyTrack | null;
  }[];
  next: string | null;
  total: number;
}

/* ── Our app's track shape (only tracks with preview_url) ── */

export interface GameTrack {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  releaseDate: string;
  releaseYear: string;
  albumArt: string;
}

/* ── Game state machine ── */

export type GamePhase =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "revealed"
  | "finished";

export interface GameState {
  phase: GamePhase;
  tracks: GameTrack[];
  playedIds: Set<string>;
  currentTrack: GameTrack | null;
  error: string | null;
}

export type GameAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; tracks: GameTrack[] }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "START_GAME" }
  | { type: "REVEAL" }
  | { type: "NEXT" }
  | { type: "RESET" };
