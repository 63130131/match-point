# Tennis League

Track tennis matches with friends — shared standings, seasons, and match history.

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173

Optional: copy `.env.example` to `.env` and set `JWT_SECRET` and `ADMIN_USERNAME` for local Node API.

## Deploy to cPanel

### Option A — subfolder `/tenis` (e.g. `matchpoint.web-tribe.si/tenis`)

```bash
npm run pack:cpanel
```

Upload **everything inside** `deploy/tenis/` into the `tenis` folder on your server — not the subdomain root.

Example for subdomain `matchpoint.web-tribe.si`:

```
public_html/matchpoint/tenis/
  index.html
  assets/
  api/
  data/
  uploads/
  .htaccess
```

Open: `https://matchpoint.web-tribe.si/tenis`

### Option B — subdomain root (e.g. `matchpoint.web-tribe.si/`)

```bash
npm run pack:matchpoint
```

Upload **everything inside** `deploy/root/` to your subdomain root folder (e.g. `public_html/matchpoint/`).

Open: `https://matchpoint.web-tribe.si/`

### After upload (both options)

1. Copy `api/config.example.php` → `api/config.php` and set `JWT_SECRET` + `ADMIN_USERNAME`
2. Set folder permissions: `data/` and `uploads/` → **755** or **775**
3. Do **not** upload the `deploy` folder itself — only its contents

### First login on production

Your **phone/production site has its own database**. Local accounts do not carry over automatically.

1. Open your live URL (e.g. `https://matchpoint.web-tribe.si/tenis`)
2. Click **Create account** (not Sign in)
3. Register as `Miha` with a new password
4. Sign in with that password

If login says **Wrong username or password** and you previously copied a database from your Mac, delete `data/tennis-league.db` on the server and register again.

**Do not upload** `data/tennis-league.db` from your Mac to the server unless you want to copy players/matches — passwords from old local-only accounts may not work.

## Accounts & security

- **Sign in required** — nobody can use the app without an account
- **Create account** — pick a username + password and a display name
- **Profile edits** — everyone can change **their own** name and photo
- **Admin** — one account (set via `ADMIN_USERNAME`) can edit or remove **other** players; regular users cannot remove anyone, including themselves
- **Matches & seasons** — any signed-in user can log matches; only delete matches you played in (admin can delete any)

### Make yourself admin

Local: in `.env` set `ADMIN_USERNAME` to your login username, restart `npm run dev`, then sign out and back in.

Production: copy `api/config.example.php` → `api/config.php` and set both `JWT_SECRET` and `ADMIN_USERNAME` (must match your login username, e.g. `Miha`). Upload only `config.php` to the server — do not commit it. Then tap **Refresh session** in the footer or sign out and back in. You should see an **Admin** badge in the header and a **Settings** tab to upload the league logo.

If you already registered before setting `ADMIN_USERNAME`, you do **not** need a new account — just fix `config.php` and refresh the session.

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
