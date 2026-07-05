/* ── Music source ── */

export type MusicSource = "spotify" | "deezer";

/* ── Spotify API response shapes ── */

export interface SpotifyTrack {
  id: string;
  uri: string;
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

export interface PlaylistItemsResponse {
  items: {
    item: SpotifyTrack | null;
  }[];
  next: string | null;
  total: number;
}

/* ── Deezer API response shapes ── */

export interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  duration: number;
  artist: { name: string };
  album: {
    id: number;
    title: string;
    cover_medium: string;
  };
  release_date?: string;
}

export interface DeezerPlaylistTracksResponse {
  data: DeezerTrack[];
  total: number;
  next?: string;
}

export interface DeezerPlaylist {
  id: number;
  title: string;
  picture_medium: string;
  nb_tracks: number;
}

/* ── Our app's unified track shape ── */

export interface GameTrack {
  id: string;
  uri: string;
  title: string;
  artist: string;
  durationMs: number;
  releaseDate: string;
  releaseYear: string;
  albumArt: string;
  previewUrl: string; // Deezer: 30s MP3; Spotify: empty string
  source: MusicSource;
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
  | { type: "RESTART_GAME" }
  | { type: "RESET" };
