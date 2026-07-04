"use client";

import { useGame } from "@/context/GameContext";

export default function GameControls() {
  const { state, dispatch } = useGame();
  const { phase } = state;

  const remaining =
    state.tracks.length - state.playedIds.size;

  return (
    <div className="flex flex-col items-center gap-3 mt-6">
      {/* Progress bar */}
      {state.tracks.length > 0 && phase !== "idle" && phase !== "loading" && (
        <div className="w-full max-w-md mb-2">
          <div className="flex justify-between text-xs text-spotify-gray mb-1">
            <span>
              Played: {state.playedIds.size} / {state.tracks.length}
            </span>
            <span>{remaining} remaining</span>
          </div>
          <div className="w-full h-1.5 bg-spotify-light rounded-full overflow-hidden">
            <div
              className="h-full bg-spotify-green rounded-full transition-all duration-500"
              style={{
                width: `${
                  state.tracks.length > 0
                    ? (state.playedIds.size / state.tracks.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        {phase === "ready" && (
          <button
            onClick={() => dispatch({ type: "START_GAME" })}
            className="px-10 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-green-400 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            ▶ Start Game
          </button>
        )}

        {phase === "playing" && (
          <button
            onClick={() => dispatch({ type: "REVEAL" })}
            className="px-10 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-green-400 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            🔍 Reveal
          </button>
        )}

        {phase === "revealed" && (
          <button
            onClick={() => dispatch({ type: "NEXT" })}
            className="px-10 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-green-400 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            ▶ Next Song
          </button>
        )}

        {phase === "finished" && (
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className="px-10 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-green-400 transition-all text-lg shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            🔄 Play Again
          </button>
        )}
      </div>

      {phase === "finished" && (
        <p className="text-spotify-gray text-sm mt-2">
          🎉 You&apos;ve gone through all {state.tracks.length} songs!
        </p>
      )}
    </div>
  );
}
