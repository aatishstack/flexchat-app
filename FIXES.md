# FlexChat Production Stabilization

## Emergency API/Auth Hotfix - May 24, 2026

Observed production failure:

- Direct requests to the Railway root route, `/health`, Socket.IO polling
  handshake, and `/auth/firebase/google` returned Railway edge
  `502 Application failed to respond`.
- Requests through Vercel `/api/backend/*` returned the same Railway `502`.
- The Vercel frontend itself continued returning HTML normally.

Root cause:

- The immediate user-facing cause is that Railway had no responding backend
  instance behind its edge, so REST auth, conversations, stories, Google token
  exchange, and Socket.IO all failed before application route logic ran.
- The stabilization deploy changed `/health` from process liveness to a
  database query. The Docker `HEALTHCHECK` calls `/health`, so database latency
  or unavailability can make an otherwise running API fail liveness and be
  removed from traffic. Railway service logs should be checked after redeploy
  to confirm the triggering health failures.
- The Docker health probe also used hardcoded port `5000` while the server
  listens on Railway's `PORT`; this is now corrected to avoid a second
  no-healthy-instance path.

Hotfix applied:

- `/health` is now lightweight process liveness; database readiness is exposed
  separately on `/ready` with a four-second timeout.
- Docker health checks target `process.env.PORT || 8080`, matching the
  Railway-facing container default.
- Railway config-as-code pins `/health` as the deployment healthcheck path.
- REST and Socket.IO auth now distinguish invalid JWTs from database lookup
  unavailability. Temporary backend failure no longer erases a valid token.
- Client API failures log request URL/status without logging token values.
  Authenticated data-read `502`, `503`, `504`, and network failures enter a
  contained session recovery state and retry; rejected refresh/token
  validation performs a full reset.
- Hydration timeout now aborts the pending `/me` request so recovery retries do
  not accumulate stalled HTTP requests.
- General API calls time out after 15 seconds; large uploads retain a
  dedicated two-minute allowance.
- The previous half-connected protected UI is replaced by a recovery screen
  with `Retry now` and `Sign out`; the socket and query-backed runtime are
  stopped while REST authentication is unavailable.
- Added diagnostic logs for query failures, socket reconnect/errors,
  authentication hydration, server request failures, CORS origin rejection,
  token rejection, and Google token verification failures.

## Issues And Fixes

### Session Hydration Freeze

Root cause: the initial `/auth/me` request could wait indefinitely on a poor
mobile connection, leaving protected routes on the session restoration screen.

Fix applied:

- Added an 8-second hydration timeout with a retained-token degraded mode.
- Added a recovery screen that keeps protected queries inactive while the API
  cannot validate the retained token.
- Added a 3-second retry loop for transient hydration failures.
- Added a 12-second safety release so route hydration cannot remain blocked.
- Socket connection starts only after authentication has hydrated successfully.

### Socket Mobile Reliability

Root cause: WebSocket traffic passed through a Vercel rewrite that cannot carry
the WebSocket upgrade, and server heartbeat timings exceeded an idle network
cutoff.

Fix applied:

- The client connects directly to Railway and attempts WebSocket before polling.
- Automatic connection is disabled until an authenticated token is provided.
- Reconnect attempts refresh both auth and query token values.
- Server heartbeat intervals are configurable and default to 20s/8s.
- REST proxying remains enabled; the Socket.IO Vercel rewrite is removed.
- Foreground and online lifecycle recovery reconnects and refreshes stale data.

### Socket Event Stability

Root cause: bad realtime payload handling could escape a callback and interrupt
the socket-driven update path.

Fix applied:

- Socket provider event entrypoints are wrapped with guarded dispatch.
- Offline state updates immediately instead of waiting for heartbeat timeout.
- Existing per-handler cleanup remains in place for React StrictMode mounts.

### Cross-Network Calls

Root cause: STUN alone cannot connect many mobile-data, carrier NAT, or
symmetric-NAT peers. A TURN relay is required for dependable cross-network
calls.

Fix applied:

- Added configurable STUN and TURN ICE servers in the call store.
- Kept trickle ICE candidate signaling already implemented by FlexChat.
- Added ICE restart after failed ICE or five seconds of disconnection.
- Added a 30-second connection timeout that closes failed calls cleanly.
- Added pooled ICE candidates and bundled RTP configuration.

Remaining blocker:

- A deployed TURN relay and working credentials are required. Suitable options
  include Metered TURN, Twilio Network Traversal, or self-hosted coturn.
  Confirm current quotas and pricing with the selected provider before launch.

### Stories On Mobile

Root cause: unmuted autoplay is rejected on mobile browsers, media had no
visible loading state, and video completion could advance twice.

Fix applied:

- Story video playback is muted, inline, and autoplay-compatible.
- Progress waits for current media loading to complete.
- Video completion is guarded against duplicate timer advancement.
- Next story images are preloaded.
- Progress fills use plain styled elements rather than animated elements on
  each animation frame.
- Story grouping now refreshes at expiry boundaries rather than clock updates.

### Mobile Conversation Navigation

Root cause: the desktop empty-chat pane remained the mobile foreground when no
conversation had been selected.

Fix applied:

- Mobile displays only the conversation list until a conversation is active.
- Mobile displays only the selected chat after selection.
- The active mobile chat header includes a back action to return to the list.
- Pending notification conversations continue to open the selected chat.

### Server Hardening

Fix applied:

- Production REST and Socket.IO CORS origins use `CORS_ORIGIN`.
- Production Fastify trusts the Railway proxy for correct client IP handling.
- Multipart uploads are capped at 50 MB.
- `/health` verifies process liveness without depending on the database.
- `/ready` verifies database connectivity and returns `503` if unavailable.

## Environment Checklist

### Vercel Client

```env
NEXT_PUBLIC_SOCKET_URL=https://flexchat-app-production.up.railway.app
NEXT_PUBLIC_TURN_URL=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-password
```

`NEXT_PUBLIC_TURN_URLS` is also supported for comma-separated TURN endpoints.

### Railway Server

```env
CORS_ORIGIN=https://flexchat-app.vercel.app
SOCKET_PING_INTERVAL_MS=20000
SOCKET_PING_TIMEOUT_MS=8000
```

Include all deployed client domains in `CORS_ORIGIN`, separated by commas.

## Testing Checklist

- Sign in over a throttled or interrupted mobile connection; UI must leave the
  restoration splash and recover without losing the token.
- Open chat on mobile with no active conversation; only the list is visible.
- Select a conversation and use the mobile back action to return to the list.
- Connect from Wi-Fi and mobile data; verify direct WebSocket connection and
  message delivery after network switching.
- Background the mobile app for longer than 30 seconds, foreground it, and
  verify conversations/stories refresh and realtime resumes.
- Open image and video stories on mobile data; verify spinner, muted autoplay,
  correct progression, and no skipped stories.
- Configure TURN credentials, then test audio and video calls with one peer on
  Wi-Fi and one peer on mobile data.
- Disable connectivity during a call and restore it; verify ICE recovery or a
  clean timeout rather than a stuck call screen.
- After deployment, call Railway `/health`; it must return `200` even while
  database readiness is impaired.
- Call Railway `/ready` with the database available and unavailable; verify
  `200`/`503` behavior.
- Call Railway root, `/me`, `/stories`, the Socket.IO handshake, and Google
  sign-in exchange after deploy; no endpoint should return Railway edge `502`.
- With a valid stored session, temporarily make the API unavailable; verify the
  recovery screen replaces chat content, retries work, and the token remains.
- With an invalid token, verify the app clears socket/query/auth state and
  returns cleanly to sign-in.
