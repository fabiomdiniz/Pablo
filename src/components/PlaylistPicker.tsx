"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import type { MusicSource } from "@/lib/types";

interface Playlist {
  id: string;
  name: string;
  image: string | null;
}

interface PlaylistPickerProps {
  selected: string[];
  onChange: (urls: string[]) => void;
}

export default function PlaylistPicker({ selected, onChange }: PlaylistPickerProps) {
  const { musicSource, spotifyAuth, deezerAuth } = useGame();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiPath = musicSource === "deezer" ? "/api/deezer/playlists" : "/api/spotify/playlists";
  const isAuthed = musicSource === "deezer" ? true : spotifyAuth; // Deezer works without login

  useEffect(() => {
    setPlaylists([]);
    setError(null);
    setLoading(true);

    if (!isAuthed) {
      setLoading(false);
      return;
    }

    fetch(apiPath)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setPlaylists(data.playlists || []);
        }
      })
      .catch(() => setError("Failed to load playlists."))
      .finally(() => setLoading(false));
  }, [apiPath, isAuthed]);

  const toggle = (id: string) => {
    const url =
      musicSource === "deezer"
        ? `https://deezer.com/playlist/${id.replace("dz_", "")}`
        : `https://open.spotify.com/playlist/${id}`;
    if (selected.includes(url)) {
      onChange(selected.filter((u) => u !== url));
    } else {
      onChange([...selected, url]);
    }
  };

  if (!isAuthed) return null;

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto mb-8">
        <div className="flex items-center gap-2 text-spotify-gray text-sm">
          <div className="w-4 h-4 border-2 border-spotify-green/30 border-t-spotify-green rounded-full animate-spin" />
          Loading your playlists...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto mb-8">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <h3 className="text-sm font-medium text-spotify-gray mb-3">
        {musicSource === "deezer" ? "Top Deezer" : "Your Spotify"} playlists ({playlists.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {playlists.map((p) => {
          const url =
            musicSource === "deezer"
              ? `https://deezer.com/playlist/${p.id.replace("dz_", "")}`
              : `https://open.spotify.com/playlist/${p.id}`;
          const isSelected = selected.includes(url);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                isSelected
                  ? "bg-spotify-green/20 border border-spotify-green/40"
                  : "bg-spotify-light/30 border border-transparent hover:bg-spotify-light/50"
              }`}
            >
              {p.image ? (
                <img src={p.image} alt="" className="w-10 h-10 rounded flex-shrink-0 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded bg-spotify-light flex-shrink-0 flex items-center justify-center">
                  <svg className="w-4 h-4 text-spotify-gray" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{p.name}</p>
              </div>
              {isSelected && <span className="text-spotify-green text-lg flex-shrink-0">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
