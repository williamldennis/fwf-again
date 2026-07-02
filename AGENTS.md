# AGENTS.md

## Cursor Cloud specific instructions

Fair Weather Friends (`fwf`) is an **Expo SDK 53 / React Native** app backed by a
**PocketBase** server and the **OpenWeatherMap** API. Standard dev/test/lint/build
commands live in `package.json` scripts and `CLAUDE.md` — use those; the notes
below only cover non-obvious, environment-specific caveats.

### Stale docs / backend migration (important)
- The backend migrated from **Supabase → PocketBase**. `CLAUDE.md` and the
  `migrations and database set up/` SQL files still describe Supabase and are
  **stale**. The live backend is PocketBase (`src/utils/pocketbase.ts`,
  `pocketbase-deploy/pb_schema.json`, `Dockerfile`, `railway.json`).
- Because of that migration, `npm test` currently **fails to run**: `jest.setup.js`
  mocks `./src/utils/supabase`, which no longer exists (`Cannot find module`). This
  is a pre-existing repo bug, not an environment problem — do not "fix" it as part
  of unrelated work.

### Backend: local PocketBase
- The app defaults `EXPO_PUBLIC_POCKETBASE_URL` to `http://localhost:8080`
  (`app.config.js`). Run a local PocketBase on that port for full functionality.
- A PocketBase v0.26.x binary is installed at `~/.local/pocketbase/pocketbase`
  with a superuser `admin@fwf.local` / `adminpassword123` and data dir
  `~/.local/pocketbase/pb_data`. Start it with:
  `~/.local/pocketbase/pocketbase serve --http=0.0.0.0:8080 --dir ~/.local/pocketbase/pb_data`
  (run it in a tmux session so it stays up).
- If collections are missing (fresh `pb_data`), apply the schema with
  `node scripts/setup-local-pocketbase.mjs` (idempotent; reads
  `pocketbase-deploy/pb_schema.json`). It opens the `users` sign-up rule so
  public email sign-up works locally.

### Running the app
- **Web is the only runnable target on this Linux VM** (no iOS/Android simulator).
  Run `npm run web` (Expo Router web via Metro on port 8081). `npm run ios` /
  `npm run android` require simulators that are unavailable here.
- Web bundling depends on two dependency fixes already committed to
  `package.json`: `@lottiefiles/dotlottie-react` (optional web peer dep of
  `lottie-react-native`) and a `react-async-hook@3.6.2` override (upstream `3.6.1`
  ships a broken `module` field that breaks Metro web resolution). Keep these.
- Native-only features (contacts, camera/selfies, location, haptics) are limited or
  unavailable on web, but the auth/onboarding flow (sign up → phone → name) renders
  and works.
- Create a `.env` (git-ignored) if you need to point at a non-default backend, e.g.
  `EXPO_PUBLIC_POCKETBASE_URL=...`. Weather/home features need
  `EXPO_PUBLIC_OPENWEATHER_API_KEY`; sign-up and early onboarding work without it.

### Verifying end to end
- Hello-world check: load `http://localhost:8081/`, sign up with an email/password
  on the login screen — it creates a record in the PocketBase `users` collection
  and navigates to the phone-number onboarding screen.
