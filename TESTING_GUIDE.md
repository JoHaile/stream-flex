# StreamFlix Cinema (Watch Party) — Testing Guide

> **For the testing agent:** if you are picking this up fresh, start with
> **§3** (the player nuance) and the **Recommended test flow** right under it,
> then work through the checklist in **§4** top-to-bottom. The single most
> important thing to verify is that two browsers a few seconds apart converge
> on the host's play/pause/seek state (**§4 → Room page**). Do not fail the
> feature because vsembed.ru itself is blocked on your network — checked in
> **§3**. When you find a real bug, write it up with (a) what you did,
> (b) what you expected, (c) what happened, and (d) whether it reproduced in
> polling mode, Ably mode, or both.

---

This guide is written for a separate testing agent/partner. It explains what
the cinema feature does, how to run it, and exactly what to verify — including
the tricky bits (embedded VidSrc player, polling fallback, LiveKit voice).

---

## 1. What was built

A "watch party" layer on top of the existing StreamFlix videos:

- **Auth** — Better Auth (email + password) with its own tables in the
  existing PostgreSQL DB (`stream-flex`, schema `public`). No third-party
  login providers.
- **Cinema rooms** — a host creates a room for a movie (from the TMDB
  catalog), gets a short shareable **room code** plus an optional **invite
  link** with a revocable/expiring token. Guests sign in (any account) and
  join by code or link.
- **Host-controlled playback** — the host's room page is the only one with
  Play / Pause / Seek controls; guests' players follow the host's commands.
- **Realtime** — Ably when `ABLY_KEY` is set; an automatic **4–8s polling
  fallback** when it isn't. The server is authoritative either way; clients
  never publish to the room channel.
- **Voice / video** — for `VOICE` and `VOICE_VIDEO` rooms via LiveKit
  (already configured in `.env.local` with the cloud `wss://...livekit.cloud`
  URL). `MOVIE_ONLY` rooms have no call UI.
- **Player mechanics** — each participant still loads the movie from their
  own existing VidSrc iframe (`vsembed.ru`). The room layer never touches
  movie bytes. Because VidSrc exposes no parent→player command API, the host
  controls are implemented by re-mounting the iframe with URL params:
  `autoplay`, `muted`, `startAt=<seconds>`.

## 2. What needs to be set up to test

1. **PostgreSQL** must be running on **`localhost:5433`** (pgAdmin bundle
   listens on 5433, not 5432), DB `stream-flex`.
2. **`DATABASE_URL`** in `.env.local`:
   `postgresql://postgres:<password>@localhost:5433/stream-flex?schema=public`
   (ask the human for the password; it is stored in `.env.local` as-is).
3. **Optional**:
   - `ABLY_KEY` — set it to test realtime instead of polling. Empty = polling.
   - `NEXT_PUBLIC_SITE_URL` — used in invite links; empty = `http://localhost:3000`.
4. `npm install` (postinstall runs `prisma generate`).
5. `npm run dev` — the app runs at `http://localhost:3000`.
   Migration `20261102201438_init_auth_cinema` has already been applied; a
   fresh DB would need `npx prisma migrate deploy`.
6. **Realtime is currently enabled** — `ABLY_KEY` is a root-access key in
   `.env.local`. That means playback events travel over Ably and arrive in
   under ~2s; the 4–8s polling fallback only kicks in if the key is removed
   or the connection fails. Expect **fast** guest sync in this configuration.

## 3. The movie player nuance (read this first)

The embedded player (`vsembed.ru`) posts **`PLAYER_EVENT`** messages to the
parent window with fields like `player_status` (`playing` / `paused` /
`completed`), `player_progress` (seconds), `player_duration`, `muted`. There
is **no documented parent→player command API**, so:

- "Play" = re-mount the iframe with `autoplay=1&muted=1&startAt=<pos>`.
- "Pause" = re-mount the iframe with `autoplay=0&muted=1&startAt=<pos>`.
- "Seek" = re-mount with `startAt=<pos>`.
- The in-iframe controls (play/pause/mute/volume) still work for the local
  user but **do not** drive the room (host is authoritative).
- If the VidSrc domain is unreachable from the test network, the iframe will
  show a player error / blank — **the room logic still works** and can be
  verified by the Play/Pause buttons, the elapsed-time display, and the
  server-side state. Do not fail the whole feature because the embed host is
  down; note it and check the rest.

**Recommended test flow** ("host" = browser A, "guest" = browser B):

1. Host opens `/sign-up`, creates an account (any email/password ≥ 8 chars).
2. Host opens a movie detail page, clicks **Watch together** (or uses the
   navbar **Watch together** button).
3. Walk the 3-step wizard: room name → comms mode (**Movie only / Voice /
   Voice + video**) → movie search (pick any title) → **Create cinema room**.
   Host lands on `/cinema/room/<CODE>`.
4. Host clicks **Play** — button becomes **Pause**; elapsed time starts
   ticking.
5. Guest (browser B) signs up too, then visits the room code URL
   `/cinema/join/<CODE>` (or the copied invite link) and clicks **Join room**.
6. Guest lands on the same room page as a guest: no Play/Pause/seek
   controls; a **Re-sync** button under the player bar; "The host controls
   playback for everyone" notice.
7. Host **Pause**, then **Play** again — within ~4–8s (polling) or ~1s
   (Ably) the guest's read-out follows (Pause button state isn't shown on the
   guest's controls, so check the elapsed-time display or use the Re-sync
   button, and compare positions between the two browsers).
8. Host clicks **Close room** → host is redirected home; guest sees the
   "The host has closed this room" banner within one poll cycle.
9. Guest clicks **Leave**.

## 4. Manual test checklist (per spec)

### Auth
- [ ] Sign-up creates an account; duplicate email is rejected.
- [ ] Sign-in with wrong password is rejected; correct password works.
- [ ] Signed-out users hitting `/cinema/create`, `/cinema/join/<code>`, or
      `/cinema/room/<code>` are redirected to `/sign-in?next=...` and return
      to their destination after signing in.
- [ ] Navbar shows the user's initial, name/email, and **Sign out** when
      signed in; **Sign in** when not.

### Create flow (wizard)
- [ ] `?movie=<tmdbId>&title=...` prefill jumps straight to step 3 with the
      movie preselected ("Ready to start" card).
- [ ] Step 1: capacity selector 2–50, must be ≥ 2 to continue.
- [ ] Step 2: three comms modes; selecting works.
- [ ] Step 3: search debounces (~350 ms), movies only, poster grid; selecting
      highlights the card; create is disabled until a movie is picked.
- [ ] A room code is **8 characters** from an unambiguous alphabet
      (no `0 O 1 I L`), displayed as a monospace badge.
- [ ] Overlay: room page shows **Invite** panel with room code + **Copy
      invite link**. The link is `/cinema/join/<CODE>?t=<token>`. Joining with
      just the code also works (token is optional).
- [ ] Host counts toward capacity (capacity 2 = host + 1 guest).

### Join flow
- [ ] Unknown code → "This room does not exist."
- [ ] **Full room** → "This room is full…" (verify by filling seats: set
      capacity 2, join with a second account, then a third account).
- [ ] **Revoked/expired invite** → only via `t=` token path; revoking isn't
      exposed in UI (server supports `revokedAt`).
- [ ] **Closed room** → join page shows "This cinema room has closed."

### Room page
- [ ] Host: Play/Pause toggle, ±30 s seek buttons, scrubber (drag then
      release seeks; host only).
- [ ] Guest: no host controls; **Re-sync** button re-applies the last known
      host state.
- [ ] Member list shows participants with a **Host** badge and seat count.
- [ ] "Polling mode" banner is visible when `ABLY_KEY` is empty; absent when set.
- [ ] LiveKit: in a `VOICE` or `VOICE_VIDEO` room the sidebar shows
      **Join call**; connecting asks for mic/camera permission; mute/camera
      toggles and **Leave call** work. In `MOVIE_ONLY` rooms no call UI exists.
- [ ] Wait: a room whose mode is VOICE/VOICE_VIDEO but whose LiveKit env is
      missing shows an informational note (not an error).

### Robustness
- [ ] Two tabs signed in as the same user in the same room do not corrupt
      state (stateVersion guard only applies newer versions).
- [ ] Host closes the room while guest is on the join page → guest sees
      "closed" (server enforces `status !== 'OPEN'`).
- [ ] Seek to a position beyond the movie → scrubs clamp to ≥ 0; server
      parser rejects non-numeric positions.
- [ ] Server action abuse: a guest calling `hostPlaybackCommand` directly
      gets `FORBIDDEN` ("Only the host can control playback."). Test by
      calling the action with a session of a non-host user.

## 5. Automated smoke test

A headless Playwright smoke test already exists as
`.smoke-cinema.mjs` (temporarily; re-create it by asking the human) and
verifies, end to end: host + guest sign-up, wizard (`?movie=` prefill),
room creation, host play, guest join-by-code, guest polling sync
(pause *and* play), host close, guest sees closed room.

Run it with the dev server up:
```bash
node ./.smoke-cinema.mjs   # uses the system Edge via Playwright channel
```
Note: Edge/Chrome must be installed on the machine (`channel: "msedge"`);
Playwright's own browser downloads are not required.

## 6. Known limitations (do not report as bugs)

- **VidSrc iframe has no direct control API** — re-mounts are the mechanism;
  a brief player reload visible on each host command is expected.
- **Guests picking their own position locally** diverges until the next host
  command or Re-sync — by design (host is authoritative).
- **Ably degrade:** without `ABLY_KEY` everything still works via polling;
  presence "who's online right now" is approximated by the database member
  list refreshed every 4–8s.
- **No chat**, **no reaction emojis**, **no user avatars** yet — invites are
  email/password accounts with initial-letter avatars.

## 7. Key files

| Area | File |
|---|---|
| DB client + adapter | `lib/db.ts` |
| Prisma config | `prisma.config.ts`, `prisma/schema.prisma` |
| Auth server | `lib/auth.ts`, `app/api/auth/[...all]/route.ts` |
| Auth client | `lib/auth-client.ts` |
| Cinema domain types/ids | `lib/cinema/types.ts`, `lib/cinema/ids.ts` |
| Server actions (create/join/control/tokens) | `lib/cinema/room-actions.ts` |
| Ably server REST helper | `lib/cinema/realtime.ts`, `lib/cinema/ably-client.ts` |
| LiveKit tokens | `lib/cinema/livekit.ts` |
| Player adapter hook | `components/cinema/useCinemaPlayer.ts` |
| Voice/video panel | `components/cinema/VoicePanel.tsx` |
| UI pages | `app/cinema/create/`, `app/cinema/join/[code]/`, `app/cinema/room/[code]/` |
| Embed util (startAt/autoplay params) | `utils/embed.ts` |

## 8. Env reference

Present in `.env.local`: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `TMDB_API_KEY`, `NEXT_PUBLIC_MOVIE_DB_BASE_URL`,
`NEXT_PUBLIC_MOVIE_DB_LATEST_URL`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
`LIVEKIT_API_SECRET`. **Empty/optional:** `ABLY_KEY`,
`NEXT_PUBLIC_SITE_URL`.