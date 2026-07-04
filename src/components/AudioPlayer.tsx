"use client";

import { useEffect, useRef } from "react";
import { Howl } from "howler";
import type { GameTrack } from "@/lib/types";

interface AudioPlayerProps {
  track: GameTrack | null;
  isPlaying: boolean;
  onEnd: () => void;
}

export default function AudioPlayer({ track, isPlaying, onEnd }: AudioPlayerProps) {
  const howlRef = useRef<Howl | null>(null);

  useEffect(() => {
    // Clean up previous Howl
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }

    if (!track) return;

    howlRef.current = new Howl({
      src: [track.previewUrl],
      html5: true,
      format: ["mp3"],
      onend: () => {
        onEnd();
      },
      onloaderror: (_id: unknown, err: unknown) => {
        console.error("Howler load error:", err);
      },
    });

    if (isPlaying) {
      howlRef.current.play();
    }

    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }
    };
    // We intentionally only recreate when the track changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  // Handle play/pause from game phase changes
  useEffect(() => {
    if (!howlRef.current) return;
    if (isPlaying) {
      howlRef.current.play();
    } else {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  return null; // Renders nothing — audio only
}
