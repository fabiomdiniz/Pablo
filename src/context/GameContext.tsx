"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
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
      return {
        ...initialState,
        phase: "loading",
      };

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
      return {
        ...initialState,
        phase: "idle",
        error: action.error,
      };

    case "START_GAME": {
      const track = pickRandomTrack(state.tracks, state.playedIds);
      if (!track) {
        return { ...state, phase: "finished", currentTrack: null };
      }
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
      if (!track) {
        return { ...state, phase: "finished", currentTrack: state.currentTrack };
      }
      const newPlayed = new Set(state.playedIds);
      newPlayed.add(track.id);
      return {
        ...state,
        phase: "playing",
        currentTrack: track,
        playedIds: newPlayed,
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
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const fetchTracks = useCallback(async (urls: string[]) => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await fetch("/api/spotify/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch({ type: "FETCH_ERROR", error: data.error || "Failed to fetch tracks." });
        return;
      }
      dispatch({ type: "FETCH_SUCCESS", tracks: data.tracks });
    } catch {
      dispatch({
        type: "FETCH_ERROR",
        error: "Network error. Check your connection and try again.",
      });
    }
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, fetchTracks }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
