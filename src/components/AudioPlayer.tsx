"use client";

import { useEffect, useRef } from "react";
import { useSpotifyPlayer } from "@/context/SpotifyPlayerContext";
import { useGame } from "@/context/GameContext";
import type { GameTrack } from "@/lib/types";

const SNIPPET_DURATION_MS = 30_000;

interface AudioPlayerProps {
  track: GameTrack | null;
  isPlaying: boolean;
  onEnd?: () => void;
}

function randomMidpoint(durationMs: number): number {
  const min = Math.floor(durationMs * 0.2);
  const max = Math.floor(durationMs * 0.7);
  return Math.floor(Math.random() * (max - min)) + min;
}

export default function AudioPlayer({ track, isPlaying, onEnd }: AudioPlayerProps) {
  const { isReady, playTrack: sdkPlay, pause: sdkPause } = useSpotifyPlayer();
  const { musicSource } = useGame();
  const lastTrackId = useRef<string | null>(null);
  const snippetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = () => {
    if (snippetTimer.current) {
      clearTimeout(snippetTimer.current);
      snippetTimer.current = null;
    }
  };

  const pause = async () => {
    clearTimer();
    if (musicSource === "spotify") {
      sdkPause().catch(() => {});
    } else {
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.removeAttribute("src");
        audioRef.current = null;
      }
    }
  };

  // Deezer playback via native HTML5 Audio
  useEffect(() => {
    if (musicSource !== "deezer" || !track || !isPlaying) return;

    const trackChanged = lastTrackId.current !== track.id;

    // Clean up previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    clearTimer();
    lastTrackId.current = track.id;

    if (!trackChanged) {
      // Same track, but element was destroyed (e.g. Strict Mode remount) — recreate
    }

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = `${window.location.origin}/api/proxy/audio?url=${encodeURIComponent(track.previewUrl)}`;
    audioRef.current = audio;

    const startMs = randomMidpoint(track.durationMs);

    const onCanPlay = () => {
      audio.currentTime = startMs / 1000;
      audio.play().catch((err) => {
        if (err.name !== "AbortError") console.error("[AudioPlayer] Play error:", err);
      });
      snippetTimer.current = setTimeout(() => {
        audio.pause();
        onEnd?.();
      }, SNIPPET_DURATION_MS);
    };

    audio.addEventListener("canplay", onCanPlay, { once: true });
    audio.addEventListener("ended", () => onEnd?.());
    audio.addEventListener("error", () => {
      // Ignore errors after cleanup (src cleared to empty/page URL)
      if (!audio.src || audio.src === window.location.href || audio.src === window.location.origin + "/") return;
      const err = audio.error;
      console.error(
        "[AudioPlayer] Audio load error:",
        { code: err?.code, message: err?.message, previewUrl: track.previewUrl }
      );
    });

    return () => {
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [track, isPlaying, musicSource, onEnd]);

  // Spotify playback via SDK
  useEffect(() => {
    if (musicSource !== "spotify" || !track || !isPlaying || !isReady) return;
    if (lastTrackId.current === track.id) return;

    clearTimer();
    lastTrackId.current = track.id;
    const startMs = randomMidpoint(track.durationMs);

    sdkPlay(track.uri, startMs).catch((err) => {
      console.error("[AudioPlayer] Play failed:", err);
    });

    snippetTimer.current = setTimeout(() => {
      sdkPause().catch(() => {});
    }, SNIPPET_DURATION_MS);
  }, [track, isPlaying, isReady, musicSource, sdkPlay, sdkPause]);

  // Stop Spotify when switching to Deezer
  useEffect(() => {
    if (musicSource === "deezer") {
      sdkPause().catch(() => {});
    }
  }, [musicSource, sdkPause]);

  useEffect(() => {
    if (!isPlaying && lastTrackId.current) {
      pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return null;
}
