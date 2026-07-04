"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, useRef } from "react";
import type { GameState, GameAction, GameTrack } from "@/lib/types";

/* ── Reducer ── */

function pickRandomTrack(tracks: GameTrack[], playedIds: Set<string>): GameTrack | null {
  const available = tracks.filter((t) => !playedIds.has(t.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

const initialState: GameState = {
  phase: "idle",
  tracks: [],
  playedIds: new Set(),
  currentTrack: null,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, phase: "loading", currentTrack: state.currentTrack, error: null };

    case "FETCH_SUCCESS": {
      const shuffled = [...action.tracks].sort(() => Math.random() - 0.5);
      return {
        ...state,
        phase: "ready",
        tracks: shuffled,
        playedIds: new Set(),
        currentTrack: null,
        error: null,
      };
    }

    case "FETCH_ERROR":
      return { ...initialState, phase: "idle", error: action.error };

    case "START_GAME": {
      const track = pickRandomTrack(state.tracks, state.playedIds);
      if (!track) return { ...state, phase: "finished", currentTrack: null };
      const newPlayed = new Set(state.playedIds);
      newPlayed.add(track.id);
      return {
        ...state,
        phase: "playing",
        currentTrack: track,
        playedIds: newPlayed,
        error: null,
      };
    }

    case "REVEAL":
      if (state.phase !== "playing") return state;
      return { ...state, phase: "revealed" };

    case "NEXT": {
      const track = pickRandomTrack(state.tracks, state.playedIds);
      if (!track) return { ...state, phase: "finished", currentTrack: state.currentTrack };
      const newPlayed = new Set(state.playedIds);
      newPlayed.add(track.id);
      return { ...state, phase: "playing", currentTrack: track, playedIds: newPlayed };
    }

    case "RESTART_GAME": {
      // Reshuffle and reset — no re-fetch
      const reshuffled = [...state.tracks].sort(() => Math.random() - 0.5);
      return {
        ...state,
        phase: "ready",
        tracks: reshuffled,
        playedIds: new Set(),
        currentTrack: state.currentTrack, // keep so AudioPlayer can pause
        error: null,
      };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

/* ── Context ── */

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  fetchTracks: (urls: string[]) => Promise<void>;
  reloadTracks: () => Promise<void>;
  lastUrls: string[];
  isAuthenticated: boolean;
  authChecked: boolean;
  checkAuth: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const lastUrlsRef = useRef<string[]>([]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/me");
      const data = await res.json();
      setIsAuthenticated(data.authenticated === true);
    } catch {
      setIsAuthenticated(false);
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const doFetch = useCallback(async (urls: string[]) => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await fetch("/api/spotify/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsAuth) setIsAuthenticated(false);
        dispatch({ type: "FETCH_ERROR", error: data.error || "Failed to fetch tracks." });
        return;
      }
      dispatch({ type: "FETCH_SUCCESS", tracks: data.tracks });
      // Update browser URL with loaded playlists
      if (typeof window !== "undefined") {
        const params = new URLSearchParams();
        urls.forEach((u: string) => params.append("p", u));
        window.history.replaceState(null, "", `/?${params.toString()}`);
      }
    } catch {
      dispatch({
        type: "FETCH_ERROR",
        error: "Network error. Check your connection and try again.",
      });
    }
  }, []);

  const fetchTracks = useCallback(async (urls: string[]) => {
    lastUrlsRef.current = urls;
    await doFetch(urls);
  }, [doFetch]);

  const reloadTracks = useCallback(async () => {
    if (lastUrlsRef.current.length === 0) return;
    await doFetch(lastUrlsRef.current);
  }, [doFetch]);

  return (
    <GameContext.Provider
      value={{
        state, dispatch, fetchTracks, reloadTracks,
        lastUrls: lastUrlsRef.current,
        isAuthenticated, authChecked, checkAuth,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
