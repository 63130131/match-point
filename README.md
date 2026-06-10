# Tennis League

Track tennis matches with friends — shared standings, seasons, and match history.

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173

Optional: copy `.env.example` to `.env` and set `JWT_SECRET` for local Node API.

## Deploy to cPanel (`/tenis`)

```bash
npm run pack:cpanel
```

Upload everything inside `deploy/tenis/` to `public_html/tenis/`.

On the server, copy `api/config.example.php` to `api/config.php` and set a strong `JWT_SECRET`.

Set folder permissions: `data/` and `uploads/` → **755** or **775**.

## Accounts & security

- **Sign in required** — nobody can use the app without an account
- **Create account** — pick a username + password and a display name
- **Profile edits** — you can only change **your own** name and photo
- **Matches & seasons** — any signed-in user can log matches

### First-time setup for your group

1. Deploy the app
2. Each friend goes to the site → **Create account**
3. Each person picks their own display name when registering

## How to use

1. **Sign in** or **Create account**
2. **Players** → edit your own photo & name
3. **New Season** → e.g. "Summer 2026"
4. **Log Match** → pick players, enter set scores
5. **Standings** → season table
6. **History** → past matches
