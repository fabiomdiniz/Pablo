"use client";

import type { GameTrack } from "@/lib/types";

interface RevealedCardProps {
  track: GameTrack;
}

export default function RevealedCard({ track }: RevealedCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 animate-in fade-in zoom-in duration-300">
      {/* Album artwork */}
      <div className="w-64 h-64 rounded-xl overflow-hidden shadow-2xl ring-2 ring-spotify-green/50">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={`${track.title} album art`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-spotify-light flex items-center justify-center">
            <svg
              className="w-16 h-16 text-spotify-gray"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Song title */}
      <h2 className="text-3xl font-bold text-white text-center mt-2">
        {track.title}
      </h2>

      {/* Artist */}
      <p className="text-xl text-spotify-gray">{track.artist}</p>

      {/* Release info */}
      <div className="flex items-center gap-3 mt-2">
        <div className="px-4 py-1.5 bg-spotify-green/20 border border-spotify-green/40 rounded-full">
          <span className="text-sm text-spotify-gray">Released: </span>
          <span className="text-sm font-semibold text-spotify-green">
            {track.releaseDate}
          </span>
        </div>
        <div className="px-4 py-1.5 bg-spotify-light rounded-full">
          <span className="text-sm font-semibold text-white">
            {track.releaseYear}
          </span>
        </div>
      </div>
    </div>
  );
}
