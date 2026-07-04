"use client";

export default function HiddenCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 px-8">
      {/* Album art placeholder */}
      <div className="w-64 h-64 bg-spotify-light rounded-xl flex items-center justify-center shadow-2xl relative overflow-hidden">
        {/* Animated equalizer bars */}
        <div className="flex items-end gap-1.5 absolute bottom-6">
          <div className="w-2 bg-spotify-green rounded-full animate-equalizer-1" />
          <div className="w-2 bg-spotify-green rounded-full animate-equalizer-2" />
          <div className="w-2 bg-spotify-green rounded-full animate-equalizer-3" />
          <div className="w-2 bg-spotify-green rounded-full animate-equalizer-4" />
          <div className="w-2 bg-spotify-green rounded-full animate-equalizer-5" />
        </div>
        {/* Center note icon */}
        <svg
          className="w-16 h-16 text-spotify-gray opacity-40"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>

      {/* Hidden text */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white animate-pulse-slow">
          Now Playing...
        </h2>
        <p className="text-spotify-gray text-sm">
          Listen carefully and guess the song!
        </p>
      </div>

      {/* Hidden details */}
      <div className="flex gap-4 mt-2">
        <div className="h-4 w-32 bg-spotify-light rounded animate-pulse" />
        <div className="h-4 w-24 bg-spotify-light rounded animate-pulse" />
      </div>
    </div>
  );
}
