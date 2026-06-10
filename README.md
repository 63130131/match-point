# Tennis League

Track tennis matches with friends — shared standings, seasons, and match history.

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173

Optional: copy `.env.example` to `.env` and set `JWT_SECRET` and `ADMIN_USERNAME` for local Node API.

## Deploy to cPanel (`/tenis`)

```bash
npm run pack:cpanel
```

Upload everything inside `deploy/tenis/` to `public_html/tenis/`.

On the server, copy `api/config.example.php` to `api/config.php` and set a strong `JWT_SECRET` plus your `ADMIN_USERNAME`.

Set folder permissions: `data/` and `uploads/` → **755** or **775**.

## Accounts & security

- **Sign in required** — nobody can use the app without an account
- **Create account** — pick a username + password and a display name
- **Profile edits** — everyone can change **their own** name and photo
- **Admin** — one account (set via `ADMIN_USERNAME`) can edit or remove **other** players; regular users cannot remove anyone, including themselves
- **Matches & seasons** — any signed-in user can log matches

### Make yourself admin

Local: in `.env` set `ADMIN_USERNAME` to your login username, restart `npm run dev`, then sign out and back in.

Production: in `api/config.php` add `putenv('ADMIN_USERNAME=yourusername');` then sign out and back in.

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
