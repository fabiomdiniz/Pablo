<p align="center">
  <img src="https://raw.githubusercontent.com/fabiomdiniz/Pablo/main/public/logo.png" alt="Pablo" width="300" />
</p>

# Pablo

A music guessing game powered by the Spotify Web Playback SDK. Listen to a random snippet, guess the artist and release year, then reveal the answer.

## How it works

1. **Log in** with your Spotify account (Premium required for playback)
2. **Pick playlists** — select from your own library or paste any Spotify playlist URL
3. **Listen** — a random song plays for 30 seconds from a random point in the track
4. **Guess** — try to name the artist, song, and release year while the details are hidden
5. **Reveal** — see the album art, title, artist, and release date

## Features

- 🎵 Full song playback via Spotify Web Playback SDK
- 📋 Browse and select from your own Spotify playlists
- 🔗 Shareable URLs — send a link with pre-loaded playlists (`?p=URL&p=URL`)
- ⏱ 30-second timed snippets starting from random mid-song positions
- 🔀 No repeats — tracks are shuffled and deduplicated per session
- 🎨 Dark theme with Spotify-inspired design
- 📱 Responsive layout

## Tech stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **Spotify Web API** — Authorization Code + PKCE flow
- **Spotify Web Playback SDK** — in-browser audio playback

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app
- A Spotify Premium account (required by the Web Playback SDK)

### Setup

```bash
git clone https://github.com/fabiomdiniz/Pablo.git
cd Pablo
npm install
```

### Configure

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. Under **Settings → Redirect URIs**, add:
   ```
   http://127.0.0.1:3000/api/spotify/callback
   ```
3. Copy the **Client ID** and **Client Secret** into `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
```

### Run

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## License

MIT
