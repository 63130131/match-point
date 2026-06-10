# Tennis League

Track tennis matches with friends — shared standings, seasons, and match history.

When you **host this online**, everyone who opens your URL sees the same players, matches, and standings. That’s what the server + database is for — not just for your laptop.

## Run locally (while building)

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Put it online (share with friends)

Deploy as **one app** (website + API together). Good options:

| Host | Works? | Notes |
|------|--------|-------|
| [Render](https://render.com) | Yes | Easiest — use the included `render.yaml` |
| Railway, Fly.io | Yes | `npm run build` then `npm start` |
| Vercel / Netlify only | No* | Static hosts can’t keep a SQLite file |

\*For Vercel/Netlify you’d need a cloud database (e.g. Supabase) instead.

### Deploy on Render (recommended)

1. Push this project to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect the repo — Render reads `render.yaml` automatically
4. Deploy — you get a URL like `https://tennis-league.onrender.com`
5. Share that link with friends

The persistent disk keeps your `tennis-league.db` safe across restarts.

### Manual deploy (any Node host)

```bash
npm run build
npm start
```

Set `PORT` if the host requires it. Optionally set `DATA_DIR` to a persistent folder path.

## How to use the app

1. **Players** — add everyone in your group
2. **New Season** — e.g. "Summer 2026"
3. **Log Match** — pick players, enter set scores, save
4. **Standings** — league table for the active season
5. **History** — past matches for the season

Anyone with the link can view and log matches (no login yet).
