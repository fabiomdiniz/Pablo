"use client";

import { useEffect, useRef } from "react";
import { useSpotifyPlayer } from "@/context/SpotifyPlayerContext";
import type { GameTrack } from "@/lib/types";

const SNIPPET_DURATION_MS = 30_000; // 30 seconds

/** Pick a random position between 20% and 70% of the track */
function randomMidpoint(durationMs: number): number {
  const min = Math.floor(durationMs * 0.2);
  const max = Math.floor(durationMs * 0.7);
  return Math.floor(Math.random() * (max - min)) + min;
}

export default function AudioPlayer({ track, isPlaying }: AudioPlayerProps) {
  const { isReady, playTrack, pause } = useSpotifyPlayer();
  const lastTrackId = useRef<string | null>(null);
  const snippetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer helper
  const clearSnippetTimer = () => {
    if (snippetTimer.current) {
      clearTimeout(snippetTimer.current);
      snippetTimer.current = null;
    }
  };

  useEffect(() => {
    if (!track || !isReady || !isPlaying) return;

    // Only play if it's a new track
    if (lastTrackId.current === track.id) return;
    lastTrackId.current = track.id;

    // Clear any previous timer
    clearSnippetTimer();

    const startMs = randomMidpoint(track.durationMs);

    playTrack(track.uri, startMs).catch((err) => {
      console.error("[AudioPlayer] Play failed:", err);
    });

    // Auto-stop after 30 seconds
    snippetTimer.current = setTimeout(() => {
      pause().catch(() => {});
    }, SNIPPET_DURATION_MS);
  }, [track, isPlaying, isReady, playTrack, pause]);

  // Pause when game leaves playing phase
  useEffect(() => {
    if (!isPlaying && lastTrackId.current) {
      clearSnippetTimer();
      pause().catch(() => {});
    }
  }, [isPlaying, pause]);

  // Reset on unmount (pause if still playing)
  useEffect(() => {
    return () => {
      clearSnippetTimer();
      if (lastTrackId.current) {
        pause().catch(() => {});
      }
      lastTrackId.current = null;
    };
  }, [pause]);

  return null;
}
