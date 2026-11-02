# StreamFlix Cinema — Watch Party Implementation Brief

> **Purpose:** Give this document to Codex, Claude Code, OpenCode, or another coding agent working inside the existing StreamFlix Cinema repository. The task is to add a synchronized virtual-cinema / watch-party feature to the product that already exists.
>
> **Primary instruction:** Build on the current application. Do not rebuild StreamFlix, replace its movie API, or redesign unrelated parts of the site.

---

## 1. Your role and expected outcome

Act as a senior full-stack engineer responsible for implementing a production-minded watch-party feature in the existing StreamFlix Cinema codebase.

You are expected to **inspect the repository, make an implementation plan, then implement and test the feature**. Do not stop after writing a proposal or a list of suggestions. Work in small, verifiable steps and preserve the working application.

The finished experience should let a signed-in user:

1. Create a private cinema room.
2. Choose the maximum number of participants.
3. Choose whether the room is movie-only, voice-enabled, or voice-and-video-enabled.
4. Choose a movie using the movie catalog and API integration that already exist in StreamFlix.
5. Create the room and receive a unique room ID and an invitation link.
6. Invite friends, who can sign in and join the room while seats are available.
7. Watch the same movie in sync, with the room creator (the **host**) controlling playback for everyone.

Every participant must load the movie through their **own existing embedded player and their own internet connection**. StreamFlix must not relay the actual movie bytes through the host's browser or its own server. The real-time system should distribute only room data and playback-control events.

Optional live voice/video should be kept separate from the movie stream and should not prevent the movie-only experience from working.

---

## 2. First: inspect the existing codebase before changing anything

Before editing files, inspect the repository and report briefly what you found. At minimum, identify:

- The framework, runtime, package manager, and deployment assumptions from the actual project files.
- The existing routing structure and conventions.
- The current movie catalog, movie-detail, and playback flows.
- The exact component or service that creates/renders the existing movie iframe.
- How a movie is identified and how the existing code obtains the iframe URL or embed configuration.
- Whether the current iframe integration exposes a documented player API for play, pause, seek, current-time reads, readiness, and playback-state events.
- The existing authentication setup and user/session model.
- The database, ORM, schema/migrations, and current data-access patterns.
- Any existing real-time, WebSocket, presence, or media infrastructure.
- The styling system, shared components, and design conventions.
- The hosting/deployment environment and whether it supports persistent WebSocket connections.

**Do not assume a library, database, schema, or file path.** Verify it from the repository. Reuse the project's conventions and dependencies wherever practical. Do not make unrelated upgrades or broad refactors as part of this task.

If a suitable Better Auth skill is provided in the workspace or agent environment, read it before touching authentication. If the skill cannot be found, do not invent its instructions; report that blocker before implementing authentication changes.

After inspection, write a short implementation plan and then proceed. Ask the developer only when a genuinely blocking decision cannot be resolved safely from the existing codebase.

---

## 3. Existing product behavior that must be preserved

StreamFlix Cinema is already a working movie website. Movie discovery and the current movie playback integration are already built.

The current player:

- Is loaded through an **iframe embed**, using the existing movie API/integration.
- Behaves similarly to an embedded YouTube player.
- Can already be controlled for playback, pause, and seeking through the integration currently in the codebase.
- May show advertisements, including around pause/seek interactions.

Treat the current iframe and its existing integration as the source of truth. Find the player implementation in the repository and build an adapter around it. Do not replace the provider or require the developer to disclose the provider name in this prompt.

### Important: advertisements

For this prototype, keep the existing provider and accept that its advertisements may appear.

- Do not attempt to remove, hide, bypass, strip, block, or circumvent the provider's advertisements.
- Do not inject scripts into a cross-origin iframe, tamper with provider responses, manipulate ad requests, or use undocumented tricks.
- Do not add a paid video provider or paid ad-free plan as a requirement for this implementation.
- If the provider later offers an official ad-free configuration, that can be evaluated separately.
- Design the synchronization logic to tolerate interruptions where possible. If the player exposes a documented ad/interruption state, use it. If it does not, do not guess or hack around it. Re-synchronize when playback becomes controllable again and document any limitation.

The goal is to prototype the watch-party experience with the player StreamFlix already has.

---

## 4. Product experience and progressive onboarding

The creation flow should feel like a polished SaaS onboarding wizard, not one long settings form. Keep each step focused, visually calm, and easy to understand. Use the existing StreamFlix design language and components.

### Entry point

Add a clear **Create Cinema Room** or **Watch Together** entry point in an appropriate existing location. Do not clutter the homepage or redesign unrelated screens.

### Step 1 — Room setup

Ask for the room basics:

- Room name (optional; provide a sensible default if omitted).
- Maximum participants / room capacity.
- Make it clear whether the host counts as one of the participants. The host **must count toward the maximum**.

Use a sensible, validated capacity range that fits the app and the selected real-time services. Do not allow zero, negative, unbounded, or invalid capacity values. Keep the step short; do not add unnecessary settings.

### Step 2 — Communication preference

Let the host choose one of these understandable options:

- **Movie only** — no microphone or camera.
- **Voice** — participants can talk with microphones; no camera required.
- **Voice + video** — participants can talk and optionally turn on their cameras.

Make it clear that voice/video is optional and separate from the movie itself. Do not request browser microphone or camera permission during onboarding. Request permission only when the user actively enables the relevant feature inside the room.

Persist the selected room communication mode. If the live-media service is not configured, do not pretend the feature works: show a clear disabled/not-configured state and explain what configuration is missing. The core movie-only room must still work.

### Step 3 — Choose the movie (last onboarding step)

Movie selection must be the **last step before creating the room**, as requested.

- Reuse the existing movie search, catalog, movie cards, and API data.
- Let the host select one movie.
- Do not create a second movie catalog or a duplicate movie API integration.
- Preserve the movie identifier and only the data needed to reopen the same movie for every participant.
- Show a compact selected-movie summary before the final create action.

### Create room

After the host confirms the movie, create the room on the server. Generate the room identifiers securely on the server, not in client-side code.

Return and display:

- A unique, non-sequential room ID/code that is safe to share.
- A complete invitation link.
- A clear **Copy invite link** action, with appropriate success/error feedback.
- A way to enter the room immediately.

If supported cleanly by the app, provide a native share action with copy-link fallback. Do not make sharing depend on a third-party service.

### Joining a room

A friend opening the invite link should:

1. Be asked to sign in or create an account if not already authenticated.
2. Return to the intended room after authentication.
3. Be shown the room/movie details and whether a seat is available.
4. Join only after the server validates the invitation, room state, membership, and capacity.
5. Load their own instance of the existing movie iframe and synchronize to the room's current playback state.

A room at capacity must reject additional participants with a friendly explanation. Handle expired, invalid, revoked, or closed-room invitations clearly.

---

## 5. Authentication — mandatory requirement

Use **Better Auth as the exclusive authentication solution**.

The developer will provide a Better Auth skill.

1. Read the provided Better Auth skill before implementing authentication-related functionality.
2. Follow its official patterns and recommendations.
3. Inspect the existing Better Auth configuration.
4. Reuse the existing authentication instance and session management.
5. Integrate cinema functionality with the existing authenticated user model.
6. Protect all cinema-related server actions and API routes.
7. Validate user sessions on the server.
8. Enforce room membership and host permissions.
9. Do not introduce another authentication library.
10. Do not duplicate existing authentication functionality.

The existing StreamFlix authentication must remain functional. Do not replace it, create a parallel user system, or change the sign-in experience unnecessarily.

Every security-sensitive operation must be authorized on the server. Hiding a button in the UI is not authorization.

---

## 6. Room identity, invitations, membership, and permissions

Implement room creation and joining with server-side validation.

### Room creation

- Generate unpredictable room identifiers using a cryptographically secure server-side method.
- Do not use sequential IDs or expose database primary keys as public invite secrets.
- Create the room and its host membership consistently, ideally in a database transaction.
- The creator becomes the room's `HOST` and has host permissions.
- The host counts as a participant for capacity calculations.

### Invitations

- Generate a secure invitation token or another equally robust invite mechanism.
- Do not rely on a guessable room code alone as the authorization secret.
- Store only a hash of a long-lived invitation secret when appropriate; never store raw secrets unnecessarily.
- Avoid leaking invitation secrets into logs, analytics, error messages, or public metadata.
- Validate invitation access on the server before joining.
- Make invitation rotation/revocation possible in the domain design, even if a full invitation-management UI is not required in the first version.

### Membership and capacity

- Enforce capacity on the server, not only in the client.
- Prevent race conditions where two users take the final seat simultaneously. Use an appropriate transaction, lock, or atomic conditional operation for the actual database.
- Prevent duplicate memberships for the same user in the same room.
- Define reconnect behavior so a temporary network drop does not permanently consume extra seats or create duplicate participants.
- Keep room membership and room-local presence separate from platform-wide analytics.

### Permissions

At minimum:

| Capability | Host | Guest |
|---|---:|---:|
| Create room | Yes | No, unless they start their own room |
| Invite friends | Yes | No, unless explicitly allowed later |
| Play / pause movie | Yes | No |
| Seek movie | Yes | No |
| Change the room's selected movie | Not in this initial scope unless already required by the existing player flow | No |
| Join / leave room | Yes | Yes |
| Enable their own microphone/camera, if room mode allows | Yes | Yes |

The host must be the authoritative controller for shared playback. A guest must not be able to send a valid host playback command by editing client state or calling an endpoint directly.

---

## 7. Movie delivery and playback synchronization

This is the most important technical part of the feature.

### A. Each participant streams independently

**Do not stream the movie from the host's browser. Do not proxy or relay the movie through the StreamFlix application server.**

Every participant should:

- Open the same movie using the existing movie API/embed configuration.
- Render their own iframe instance in their own browser.
- Download/stream the movie directly through the existing provider/embed route using their own internet connection.

The host's internet connection must not determine the guests' movie download speed. A slow host connection may delay the host's own playback, but it must not become a bandwidth bottleneck for everyone else's movie stream.

The application server/realtime system should distribute only small control/state messages, participant presence, and room metadata — **never the actual movie video or audio bytes**.

### B. Build a player adapter around the existing iframe API

Do not scatter provider-specific iframe calls throughout the application. Create a small, typed player adapter that wraps the existing integration.

The adapter should expose only the operations and events that the current provider actually supports, such as:

- `ready` / player-ready state.
- `play()`.
- `pause()`.
- `seekTo(position)`.
- `getCurrentTime()`.
- `getPlaybackState()`.
- Playback state/time/error/buffering events, where supported.
- Cleanup/unsubscribe behavior when the player or room unmounts.

Use the provider's existing documented API or the exact integration already in the project. Do not assume every iframe is controllable just because it is an iframe. Do not directly inspect or manipulate the cross-origin iframe DOM. Do not invent undocumented `postMessage` commands.

If an existing player wrapper already exposes these operations, reuse it and add the smallest necessary interface. Avoid creating a second iframe or loading the movie twice in one participant's browser.

### C. Authoritative room playback state

The server must be the source of truth for shared playback state. Model the minimum state needed, for example:

- `isPlaying`.
- `positionSeconds` (or integer milliseconds).
- `updatedAt` / authoritative timestamp.
- A monotonically increasing `stateVersion` or event sequence number.
- Optional playback rate only if the existing player supports it and the product requires it.

Use the actual project's database and serialization conventions. Avoid storing an unbounded playback event history for this MVP.

### D. How synchronization should work

1. The host controls the movie using the existing player.
2. When the host plays, pauses, or seeks, the client reports the intended action to a protected server endpoint/action.
3. The server verifies the Better Auth session, room membership, and that the actor is the room host.
4. The server validates and records the new authoritative playback state, increments the state version, and publishes the change to the room's private real-time channel.
5. Guests receive the event and apply it to their own player through the player adapter.
6. A participant joining mid-movie fetches the current authoritative state and seeks/plays or pauses accordingly once their iframe reports ready.
7. On reconnect, a participant fetches the latest state and converges to it rather than replaying stale events.

Use timestamps and the current playback position to estimate where the movie should be when a client receives an event. For example, while the room is playing, the target position is the last authoritative position plus the elapsed time since the server timestamp. Account for network delay and player readiness.

### E. Drift correction

Network latency, buffering, autoplay restrictions, and provider behavior can cause participants to drift apart.

Implement conservative drift correction:

- Measure a participant's player time against the room's calculated target time.
- Ignore tiny differences that do not affect the experience.
- For meaningful drift, seek to the authoritative position when the player is ready and seeking is supported.
- Avoid repeatedly seeking on every small time update; that creates a worse experience.
- If the existing player supports safe, documented playback-rate adjustment, it may be used for small corrections. Do not assume it does.
- Prevent correction loops where a guest's correction event is mistaken for a host command.
- Handle buffering, player reloads, tab backgrounding, and reconnects.

Use a clear syncing/buffering status in the UI when useful, but do not fill the screen with technical diagnostics.

### F. Host-only controls

- The host's play, pause, and seek actions must synchronize to all guests.
- Guests must not be able to change the authoritative room state.
- Hide or disable player controls for guests if the existing player API supports that safely.
- If the provider leaves guest controls visible, listen for local guest-side changes where possible and restore the authoritative room state. The server must still reject guest control requests.
- Do not trust a client-provided `role`, `isHost`, or `userId`; derive authority from the authenticated server session and room membership.

### G. Ads and interruptions

Advertisements may not appear at the same time for every participant. This can temporarily make exact synchronization impossible.

- Never bypass or remove ads.
- If the provider documents an ad state, pause drift correction while a participant is in an ad and re-sync when the movie content resumes.
- If no ad state is exposed, handle player interruptions defensively and re-sync when normal playback becomes available again.
- Do not let an ad-related local pause accidentally publish a host pause command unless the host intentionally paused the movie.
- Document that synchronization may be imperfect during provider advertisements or provider-side interruptions.

The prototype should still be useful with the existing provider, even if advertisements occasionally interrupt the shared experience.

---

## 8. Real-time technology recommendation

Keep the real-time implementation compatible with the actual deployment environment. Inspect the project before selecting or adding infrastructure.

### Recommended separation of responsibilities

**Playback commands and room presence:** Prefer an existing suitable real-time service if one is already installed and operational. If the project has no suitable service, use a managed real-time pub/sub service such as **Ably** for room events and presence, subject to verifying current SDK guidance and the deployment setup.

**Optional voice/video:** Use **LiveKit** for microphone and camera rooms. It is designed for real-time media and uses a media-server/SFU architecture so participants connect through the service rather than sending every media stream through the host's browser.

Keep these services behind small application interfaces so they can be replaced later without rewriting room and playback business logic.

### Important implementation rules

- Do not add a custom Socket.IO server or persistent WebSocket process without confirming that the actual hosting platform supports it in production.
- Do not rely on an in-memory event emitter, local process state, or a single server instance for production room synchronization.
- Do not expose Ably, LiveKit, or other server secrets in browser code.
- Issue short-lived, scoped tokens from authenticated server endpoints after checking room membership and permissions.
- Use private, room-scoped channels/namespaces. A user must not subscribe to arbitrary private rooms simply by changing a room ID in the browser.
- Validate all host commands on the server before publishing them.
- Guests should receive only the permissions they need (for example, subscribe to room playback updates; they must not be granted host publication privileges).
- Keep room presence limited to the room. Do not build global online tracking in this phase.
- Check the current official SDK documentation for any newly introduced service and use maintained packages and current APIs. Do not copy obsolete code examples.
- Do not assume a service is free or require a paid subscription without telling the developer. Build the core movie-only experience so it can be tested without enabling voice/video.

If Ably or LiveKit credentials are not available, implement the clean integration boundary and document the exact environment variables/setup required. Do not fake a successful connection or show a feature as active when it is not configured.

---

## 9. Optional voice and video experience

Voice/video is an optional communication layer. It is not the movie stream.

If LiveKit is configured and the repository can support it cleanly:

- Create/join a LiveKit room corresponding to the authorized StreamFlix cinema room.
- Generate LiveKit access tokens on the server only after checking Better Auth session, room membership, room communication mode, and room capacity.
- Give each participant permission to publish only the tracks allowed by the room mode and their own settings.
- Support microphone mute/unmute and camera on/off controls.
- Show a simple participant media area/grid that fits the existing design and works on desktop and mobile.
- Handle permission denial, missing devices, reconnects, and participant departure gracefully.
- Let users join movie-only rooms without requesting microphone or camera permissions.
- Do not enable a camera automatically without an explicit user action.

If the developer has not configured LiveKit yet:

- Keep the room communication preference in the room model.
- Keep the communication UI/adapter modular.
- Clearly mark voice/video as unavailable until configuration is supplied.
- Do not make room creation or synchronized movie playback depend on LiveKit.
- Document the required setup and environment variables.

Do not implement screen sharing, recording, public broadcasts, or unrelated conferencing features in this phase.

---

## 10. Architecture and data model guidance

Fit the actual database/ORM and code conventions. The following are conceptual entities, not instructions to create duplicate or unnecessary tables if equivalent structures already exist.

### Cinema room

A room will likely need fields equivalent to:

- Internal primary key.
- Public, unpredictable room code/identifier.
- Host user ID (linked to the existing authenticated user).
- Room name.
- Selected movie's existing provider/catalog identifier.
- Maximum participant count.
- Communication mode (`MOVIE_ONLY`, `VOICE`, `VOICE_VIDEO`, or the project's equivalent).
- Status (`OPEN`, `CLOSED`, or equivalent).
- Current authoritative playback state (`isPlaying`, position, timestamp, state version), or a clean related playback-state record.
- Created/updated timestamps.
- Invitation token hash/metadata if using a separate invitation secret.

### Room membership

A membership/participant record will likely need:

- Room ID.
- Existing authenticated user ID.
- Role (`HOST` or `GUEST`).
- Join/leave or membership timestamps as appropriate.
- A unique constraint preventing duplicate membership for the same user and room.

Do not store sensitive browser/device details without a clear need. Do not create a permanent watch-history or surveillance system as part of this feature.

### Presence

Use the real-time provider's room-scoped presence for transient online/connected state where possible. Persist only what is needed for room membership, authorization, reconnect behavior, and the current product experience.

A small room participant list or room-local participant count is in scope because it helps users understand who is in their current room and how many seats are occupied. A platform-wide online-user dashboard or global watching analytics is **not** in scope.

### Database quality

- Add appropriate relations, unique constraints, indexes, and foreign keys.
- Use migrations in the project's existing migration workflow.
- Make room creation and membership insertion consistent.
- Handle room closure and stale membership/presence safely.
- Avoid storing redundant copies of entire movie API responses.
- Do not store raw invitation secrets or real-time service secrets.

---

## 11. UI requirements for the cinema room

Keep the interface focused. The movie remains the main attraction.

The room page should include, as appropriate to the existing design:

- The existing iframe movie player, with no unnecessary second player.
- Movie title and concise room identity.
- A small participant list/count and seats-used indicator.
- Host playback controls or the existing host player controls.
- Clear host/guest distinction without exposing sensitive information.
- A copy-invite-link action available to the host.
- A clear leave-room action.
- A subtle connection/syncing/reconnecting state when necessary.
- Optional voice/video panel only for rooms that enable it and only when configured.

Do not add unrelated social features, a chat system, a movie queue, payments, subscriptions, public room discovery, or a large dashboard unless they already exist and are directly required for compatibility.

### Design standards

- Reuse existing colors, typography, spacing, icons, components, and responsive patterns.
- Keep the onboarding progressive: one decision-focused step at a time, with Back/Continue and visible progress.
- Preserve form values when navigating between steps.
- Validate each step and show errors beside the relevant field.
- Provide useful empty, loading, success, and failure states.
- Make controls accessible by keyboard and screen reader.
- Make the room usable on desktop and mobile.
- Avoid visual clutter and unnecessary configuration choices.

---

## 12. Security, validation, and reliability

Treat rooms as private resources. At minimum:

- Validate Better Auth sessions on every protected server operation.
- Check room membership before returning private room data or issuing real-time/media tokens.
- Check host ownership on every playback command.
- Validate room IDs, invite tokens, capacity, communication mode, movie ID, and playback positions on the server.
- Reject malformed, stale, unauthorized, and out-of-range playback commands.
- Add reasonable rate limiting to room creation, invitation attempts, and join attempts using infrastructure compatible with the project.
- Prevent invitation-token leakage in logs and error output.
- Keep third-party secret keys on the server.
- Avoid trusting client-supplied roles, capacities, user IDs, or host flags.
- Handle duplicate requests and retries safely.
- Use safe error messages that help the user without exposing implementation details.
- Ensure a guest cannot publish a host command by calling a server action or endpoint directly.
- Ensure a user cannot join a room beyond its capacity by racing concurrent requests.

Do not add hidden access mechanisms, backdoors, secret admin accounts, or authentication bypasses.

---

## 13. Future extensibility — explicitly out of scope for this phase

Design the cinema architecture so additional administrative and analytics functionality can be introduced later.

Keep room management, participant management, and real-time events modular.

**Do not implement** an administrative dashboard, online-user analytics, watching-activity analytics, platform-wide monitoring, or a global user-tracking system in this development phase.

Do not introduce hidden access mechanisms or backdoors. All future administrative functionality must use explicit authentication and authorization.

The room and participant boundaries should be clean enough that a future authorized admin feature can be added without rewriting the watch-party core. Do not build that future feature now.

---

## 14. Suggested implementation phases

Work in these phases. Keep the existing application running after each phase.

### Phase 0 — Repository reconnaissance

- Inspect the current application and report the actual stack and relevant files.
- Locate the existing iframe player and its supported control API.
- Read the supplied Better Auth skill.
- Identify the database and deployment constraints.
- Decide whether an existing real-time service can be reused or whether Ably is appropriate.
- Identify whether LiveKit can be configured now or should remain an optional integration boundary.

### Phase 1 — Domain model and secure room APIs

- Add the minimum room, membership, invitation, and playback-state schema using existing project conventions.
- Add and run migrations.
- Implement authenticated server-side room creation.
- Implement invite validation and room joining.
- Enforce host/guest roles and participant capacity, including race-safe admission.
- Add tests for authorization and capacity behavior.

### Phase 2 — Progressive room onboarding

- Add the Create Cinema Room entry point.
- Implement room setup, communication preference, and movie selection in that exact order.
- Reuse existing movie search/cards/data.
- Create the room only after the final movie-selection step.
- Display the room code and invite link after successful creation.
- Add join-by-invite flow with authentication return handling.

### Phase 3 — Synchronized movie playback MVP

- Build/reuse the typed adapter around the existing iframe player.
- Establish private room playback events and authoritative state.
- Implement host-only play, pause, and seek synchronization.
- Synchronize guests when they join, reconnect, or become ready.
- Add conservative drift correction and interruption handling.
- Confirm each browser loads its own iframe independently.

### Phase 4 — Optional voice/video

- Add LiveKit integration if credentials/configuration are available and the developer wants it enabled now.
- Otherwise, finish the modular integration boundary and document the setup needed.
- Ensure movie-only rooms do not require media permissions or LiveKit connectivity.

### Phase 5 — Polish, tests, and handoff

- Test key flows and failure states.
- Check mobile and desktop layouts.
- Review security and server-side authorization.
- Run the project's lint, typecheck, unit/integration tests, and production build commands where available.
- Fix regressions introduced by the feature.
- Update concise setup documentation and environment-variable examples.
- Provide a final implementation report.

---

## 15. Required tests and acceptance criteria

The feature is not complete until the following behavior has been tested or clearly identified as blocked by missing external configuration.

### Authentication and rooms

- An unauthenticated visitor cannot create or join a private room without authenticating.
- Existing StreamFlix authentication continues to work.
- An authenticated user can create a room through the three-step flow.
- The chosen movie and communication mode are saved correctly.
- The server generates a unique room ID and invitation link.
- The host is recorded as the room host and counts toward capacity.
- A valid invite lets another authenticated user join.
- Invalid, expired, revoked, or closed-room invites are rejected safely.
- A room at capacity rejects another participant.
- Concurrent attempts for the final seat cannot exceed capacity.
- Duplicate joins do not create duplicate memberships.

### Playback synchronization

- Each participant loads the existing movie iframe independently.
- The server never proxies or relays the movie file.
- When the host presses Play, guests play.
- When the host presses Pause, guests pause.
- When the host seeks, guests seek to the corresponding position.
- A guest cannot change authoritative playback state.
- A guest calling a protected endpoint directly cannot impersonate the host.
- A participant joining halfway through the movie synchronizes to the current room position.
- A reconnecting participant fetches the latest state and recovers.
- Minor time drift does not cause repeated disruptive seeks.
- Buffering, iframe readiness, and autoplay restrictions are handled gracefully.
- Provider ads are not bypassed; any unavoidable ad-related sync limitation is documented.

### Communication

- Movie-only mode works without camera/microphone permissions.
- Voice/video are not shown as active when the service is unconfigured.
- When LiveKit is configured, only authorized room participants can join the matching media room.
- Microphone and camera start only after the user's explicit action.
- Muting, camera-off, leaving, and reconnection work as expected.

### Quality and regression

- No unrelated movie browsing or playback behavior is broken.
- No second movie API/catalog is introduced.
- No new authentication provider is introduced.
- No server secret is exposed to the browser.
- No hidden admin/backdoor mechanism is created.
- Relevant migrations, types, tests, and documentation are committed with the feature.
- The project passes its available lint, typecheck, tests, and production build checks, or the final report explains any pre-existing failures separately from new failures.

---

## 16. What not to do

- Do not rebuild StreamFlix from scratch.
- Do not replace the existing movie API or iframe player.
- Do not ask the developer to disclose the movie API provider in order to begin; inspect the existing integration in the repository.
- Do not proxy the movie stream through the host or application server.
- Do not attempt to bypass or remove advertisements.
- Do not assume arbitrary iframe control; use the existing documented integration.
- Do not let guests control shared playback.
- Do not trust client-side roles or permissions.
- Do not add another authentication library. Better Auth is mandatory.
- Do not build a custom persistent WebSocket server without validating production hosting compatibility.
- Do not add global online analytics or an admin dashboard now.
- Do not implement backdoors or hidden access mechanisms.
- Do not add unrelated features or dependencies without a clear technical reason.
- Do not fake external-service functionality when credentials are missing.

---

## 17. Final handoff report

When implementation is complete, provide a concise but useful report containing:

1. What was implemented, organized by the phases above.
2. The main files/components/routes/schema changes made.
3. Which real-time technology was used for playback/presence and why.
4. Whether LiveKit voice/video is fully configured, partially wired, or awaiting credentials.
5. Required environment variables, with example names and no real secrets.
6. Database migration and setup commands.
7. Tests, lint, typecheck, and build commands run, with results.
8. Known limitations, especially any iframe-provider or advertisement-related synchronization limitations.
9. Any remaining manual setup required from the developer.

Be honest about what is and is not working. Do not claim a feature is complete unless it has been implemented and verified.

---

## Final product principle

**StreamFlix should feel like a cinema people enter together, not a complicated conferencing tool.** Keep the setup progressive, keep the movie central, let every participant stream independently, and make the host the single authority for shared playback. Build the smallest reliable version first, without compromising the existing website.
