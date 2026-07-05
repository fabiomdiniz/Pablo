import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, extractPlaylistId } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playlistUrl = searchParams.get("playlist");

  try {
    const token = await getAccessToken(request.cookies);
    const maskedToken = token.slice(0, 10) + "..." + token.slice(-5);

    const result: Record<string, unknown> = {
      token_ok: true,
      token_preview: maskedToken,
    };

    // Step 1: Check what devices Spotify sees
    const devicesRes = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${token}` },
    });
    result.devices_status = devicesRes.status;
    if (devicesRes.ok) {
      const devicesData = await devicesRes.json();
      result.devices = devicesData.devices;
      result.device_count = devicesData.devices?.length ?? 0;
    } else {
      const body = await devicesRes.text();
      result.devices_error = body.slice(0, 300);
    }

    // Step 2: Check if playback state is available
    const stateRes = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` },
    });
    result.player_state_status = stateRes.status;
    if (!stateRes.ok && stateRes.status !== 204) {
      const body = await stateRes.text();
      result.player_state_error = body.slice(0, 300);
    }

    // Step 3: Check player/play endpoint (without body — just availability)
    const playRes = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    result.player_play_status = playRes.status;
    if (!playRes.ok) {
      const body = await playRes.text();
      result.player_play_error = body.slice(0, 300);
    }

    // Step 4: Playlist check (if provided)
    if (playlistUrl) {
      const id = extractPlaylistId(playlistUrl);
      if (!id) {
        result.playlist_error = "Could not extract playlist ID from URL";
      } else {
        result.playlist_id = id;

        const url = `https://api.spotify.com/v1/playlists/${id}/items?limit=20`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        result.playlist_status = res.status;
        if (!res.ok) {
          const body = await res.text();
          result.playlist_error = body.slice(0, 500);
        } else {
          const data = await res.json();
          result.track_count = data.total;
          result.first_track = data.items?.[0]?.item?.name ?? "none";
          result.preview_count_in_first_page = data.items.filter(
            (i: { item: { preview_url: string | null } | null }) => i.item?.preview_url
          ).length;
          result.total_in_first_page = data.items.length;
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
