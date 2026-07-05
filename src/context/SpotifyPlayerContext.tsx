"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

declare global {
  interface Window {
    Spotify: {
      Player: new (config: SpotifyPlayerConfig) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady: (() => void) | undefined;
  }
}

interface SpotifyPlayerConfig {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayerInstance {
  addListener: (event: string, cb: (state: any) => void) => boolean;
  removeListener: (event: string, cb?: (state: any) => void) => boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getVolume: () => Promise<number>;
  setVolume: (v: number) => Promise<void>;
  togglePlay: () => Promise<void>;
}

interface PlayerContextValue {
  isReady: boolean;
  isPremium: boolean;
  deviceId: string | null;
  errorMessage: string | null;
  playTrack: (uri: string, positionMs?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}

const SpotifyPlayerContext = createContext<PlayerContextValue | null>(null);

export function SpotifyPlayerProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);
  const apiDeviceIdRef = useRef<string | null>(null);

  const getToken = useCallback((): Promise<string> => {
    return fetch("/api/spotify/token")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        return d.access_token as string;
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initPlayer = () => {
      if (!window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady = () => initPlayer();
        return;
      }

      const player = new window.Spotify.Player({
        name: "Pablo",
        getOAuthToken: (cb: (token: string) => void) => {
          getToken()
            .then((token) => cb(token))
            .catch((err) => {
              console.error("[Player] Failed to get token:", err);
              setErrorMessage("Token fetch failed. Click Disconnect and log in again.");
            });
        },
        volume: 0.8,
      });

      let deviceReady = false;
      let connectDone = false;

      const maybeReady = () => {
        if (deviceReady && connectDone && !cancelled) {
          console.log("[Player] Fully ready");
          setIsReady(true);
          setIsPremium(true);
          setErrorMessage(null);
        }
      };

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("[Player] SDK ready, device_id:", device_id);
        setDeviceId(device_id);
        deviceReady = true;
        maybeReady();
      });

      player.addListener("not_ready", () => {
        setIsReady(false);
        deviceReady = false;
      });

      player.addListener("initialization_error", ({ message }: { message: string }) => {
        console.error("[Player] Init error:", message);
        setErrorMessage(message.includes("Premium")
          ? "Spotify Premium is required."
          : `Player init failed: ${message}`);
      });

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        // Transient — don't show error banner, the SDK may recover
        console.warn("[Player] Auth warning (may be transient):", message);
      });

      player.addListener("account_error", ({ message }: { message: string }) => {
        console.error("[Player] Account error:", message);
        setErrorMessage("Spotify Premium required.");
      });

      player.addListener("playback_error", ({ message }: { message: string }) => {
        console.error("[Player] Playback error:", message);
      });

      player.connect().then((success: boolean) => {
        console.log("[Player] connect() resolved:", success);
        if (!success) setErrorMessage("Failed to connect Spotify player.");
        connectDone = true;
        maybeReady();
      });

      playerRef.current = player;
    };

    initPlayer();

    return () => {
      cancelled = true;
      if (playerRef.current) playerRef.current.disconnect();
    };
  }, [getToken]);

  // Find the "Pablo" device in the API list by name
  const findApiDeviceId = useCallback(async (token: string): Promise<string> => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { devices } = await res.json();
        const pablo = devices?.find((d: { name: string }) => d.name === "Pablo");
        if (pablo) {
          console.log("[Player] Found Pablo in API, id:", pablo.id);
          apiDeviceIdRef.current = pablo.id;
          return pablo.id;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("Pablo device not found. Please refresh and try again.");
  }, []);

  const playTrack = useCallback(async (uri: string, positionMs = 0) => {
    const token = await getToken();
    const did = await findApiDeviceId(token);

    // Transfer then play
    await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_ids: [did] }),
    });
    await new Promise((r) => setTimeout(r, 400));

    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${did}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
      }
    );

    if (res.status === 204) {
      console.log("[Player] Playback started");
      return;
    }

    const body = await res.text();
    throw new Error(`Playback failed: ${res.status} ${body}`);
  }, [getToken, findApiDeviceId]);

  const pause = useCallback(async () => {
    const token = await getToken();
    const did = apiDeviceIdRef.current;
    await fetch(
      `https://api.spotify.com/v1/me/player/pause${did ? `?device_id=${did}` : ""}`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
    );
  }, [getToken]);

  const resume = useCallback(async () => {
    const token = await getToken();
    const did = apiDeviceIdRef.current;
    await fetch(
      `https://api.spotify.com/v1/me/player/play${did ? `?device_id=${did}` : ""}`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
    );
  }, [getToken]);

  return (
    <SpotifyPlayerContext.Provider
      value={{ isReady, isPremium, deviceId, errorMessage, playTrack, pause, resume }}
    >
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

export function useSpotifyPlayer(): PlayerContextValue {
  const ctx = useContext(SpotifyPlayerContext);
  if (!ctx) throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider");
  return ctx;
}
