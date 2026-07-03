# AGENTS.md

## Cursor Cloud specific instructions

Fair Weather Friends (`fwf`) is an **Expo SDK 55 / React Native 0.83** app backed by a
**PocketBase** server and the **OpenWeatherMap** API. Standard dev/test/lint/build
commands live in `package.json` scripts and `CLAUDE.md`; the notes below cover the
non-obvious, environment-specific bits.

### Dependencies
- Install with **`npm install --legacy-peer-deps`** — the project has peer-dependency
  conflicts and a plain `npm install` fails. Use the same flag when adding packages, and
  prefer `npx expo install <pkg>`'s resolved version (SDK 55 uses SDK-aligned versions,
  e.g. `expo-notifications@~55.x`).

### Backend: local PocketBase
- The app defaults `EXPO_PUBLIC_POCKETBASE_URL` to `http://localhost:8080`
  (`app.config.js`); production is the Railway URL. Run a local PocketBase on 8080 for full
  functionality.
- Serve it with the hooks and migrations directories enabled so server-side features work:
  `pocketbase serve --http=0.0.0.0:8080 --dir <data-dir> --hooksDir <repo>/pb_hooks --migrationsDir <repo>/pb_migrations`
  (run it in a tmux session so it stays up).
- Apply the collection schema to a fresh instance with
  `node scripts/setup-local-pocketbase.mjs` — idempotent; reads
  `pocketbase-deploy/pb_schema.json`, opens the `users` sign-up rule, and creates all base
  collections plus `created`/`updated` autodate fields (PocketBase 0.23+ doesn't auto-add
  those, and the app sorts by `created`). Defaults: superuser `admin@fwf.local` /
  `adminpassword123`, `PB_URL=http://localhost:8080` (override via env vars).

### Server-side PocketBase code (hooks + migrations)
- `pb_hooks/*.pb.js` and `pb_migrations/*.js` ship into the Docker image (`Dockerfile`) and
  load via `--hooksDir` / `--migrationsDir`; PocketBase automigrate applies pending
  migrations on startup. The Railway instance is updated by redeploying the image.
- `pb_hooks/garden_activity_push.pb.js` sends Expo push notifications when a friend plants
  in or harvests from a user's garden. For local testing without real devices, set
  `EXPO_PUSH_API_URL` to a local HTTP listener to capture the push payloads.

### Running the app
- iOS is the primary target: **`npx expo run:ios`** (builds the dev client, required
  because the app uses native modules such as `expo-notifications`). After adding or
  upgrading a native dependency, do a full `expo run:ios` rebuild — a plain `expo start`
  against a stale build errors with "native module doesn't exist".
- `.env` (git-ignored) holds `EXPO_PUBLIC_POCKETBASE_URL`, `EXPO_PUBLIC_OPENWEATHER_API_KEY`,
  and optional PostHog keys. Weather/home need the OpenWeather key; sign-up and early
  onboarding work without it.

### Push notifications
- Delivery requires a physical device + dev/EAS build — Expo Go and the iOS Simulator
  can't receive remote push. The client registration no-ops on non-devices, so simulator
  work is unaffected.
- The prod schema bits notifications rely on (`push_token` field, plus the `phone_number`
  unique index) are applied automatically by `pb_migrations` on the next Railway deploy;
  ensure `/pb/pb_data` is a persistent Railway volume so schema/data survive redeploys.
