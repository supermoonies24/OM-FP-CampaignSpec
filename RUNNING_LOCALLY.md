# Running CampaignSpec Locally

## First-time setup

```bash
npm install
npx prisma migrate dev --name init   # creates dev.db and applies schema
npx prisma db seed                    # loads default dropdown options
```

(`.env` already has `DATABASE_URL="file:./dev.db"` and `PASSCODE="fordpro2024"`. If it's missing, run `.devcontainer/setup.sh` to recreate it.)

## Start the server

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login` since every route requires a session cookie (see `proxy.ts`). Log in with the passcode from `.env` (`fordpro2024` by default).

Leave the `npm run dev` process running in its own terminal; closing the terminal or killing the process is why the app "isn't always on." Press `Ctrl+C` in that terminal to stop it.

## Other useful commands

```bash
npm run build && npm run start   # production build, served on :3000
npm run lint                     # ESLint
npx prisma studio                # browse/edit dev.db in a GUI
```

## Notes

- Data lives in the local SQLite file `dev.db` — it persists between restarts but isn't committed to git.
- This project runs Next.js 16, which renamed `middleware.ts` to `proxy.ts` (see `AGENTS.md`) — that's where the login-gate logic lives, not in a `middleware.ts` file.
