# 3. Authentication

## What Discord OAuth2 actually gives you

Discord's OAuth2 is how you learn who someone is **outside** Discord. The browser never gets a bot token and
never talks to Discord's API directly; it talks to your API, which holds the credentials.

Three scopes matter here:

| Scope                 | What it returns                                                           | Needed?            |
| --------------------- | ------------------------------------------------------------------------- | ------------------ |
| `identify`            | `id`, `username`, `global_name`, `avatar` — no email                      | Yes                |
| `guilds`              | Every guild the user is in, with **their** `permissions` bitfield in each | Yes                |
| `guilds.members.read` | The user's roles in a specific guild                                      | No — see below     |
| `email`               | Their email address                                                       | **No.** Never ask. |

`guilds.members.read` looks tempting for role-based access, but the bot is already in the guild and can fetch the
member itself, which is both authoritative and free. Asking for less on the consent screen is a feature: a
dashboard that asks for `identify` and `guilds` reads as reasonable; one that asks for `email` reads as a
mailing-list harvest and costs you sign-ups.

**The `guilds` payload is a snapshot, not a permission system.** It is what the user's session says at login. It
goes stale the moment their roles change, and it is a claim about a different system. It is fine for _rendering a
guild list_. It is not fine for authorising a write — see `04-PERMISSIONS.md`.

## The flow, end to end

```
Browser                     Your API                          Discord
   │                           │                                 │
   │ click "Sign in"           │                                 │
   ├──── GET /api/auth/login ─►│                                 │
   │                           │ generate state + PKCE verifier  │
   │                           │ store both in a short cookie    │
   │◄── 302 to discord.com ────┤                                 │
   │                                                             │
   ├──────── user approves the consent screen ──────────────────►│
   │                                                             │
   │◄──────── 302 back to /api/auth/callback?code=…&state=… ─────┤
   │                           │                                 │
   ├── GET /api/auth/callback ►│                                 │
   │                           │ compare state with the cookie   │
   │                           ├── POST /oauth2/token ──────────►│
   │                           │    (client_id + client_secret   │
   │                           │     + code + code_verifier)     │
   │                           │◄── access_token, refresh_token ─┤
   │                           ├── GET /users/@me ──────────────►│
   │                           ├── GET /users/@me/guilds ───────►│
   │                           │ create session document         │
   │◄── 302 to /  + Set-Cookie ┤                                 │
   │      dash_session (httpOnly)                                │
   │      dash_csrf    (readable)                                │
```

### `GET /api/auth/login`

1. Generate 32 random bytes → `state`. Generate a PKCE `code_verifier` (43–128 chars) and its
   `code_challenge` = base64url(SHA-256(verifier)).
2. Store `{ state, verifier, returnTo }` in a **short-lived signed httpOnly cookie** (`dash_oauth`, 10 minutes,
   `SameSite=Lax`). A cookie rather than server memory so the flow survives a restart, and rather than a Mongo
   write so an unauthenticated endpoint cannot be used to fill your database.
3. 302 to:
   `https://discord.com/oauth2/authorize?response_type=code&client_id=…&scope=identify%20guilds&state=…&redirect_uri=…&code_challenge=…&code_challenge_method=S256&prompt=none`

`prompt=none` skips the consent screen for a user who has already authorised, which makes returning feel instant.

**`state` is not optional.** Without it, an attacker can hand a victim a callback URL carrying the attacker's
code, logging the victim into the attacker's account — and any guild they then configure is configured on the
attacker's behalf. The check is three lines. Do it.

PKCE is belt-and-braces for a confidential client that has a secret anyway, but it costs nothing and closes
authorization-code interception if the redirect ever leaks through a referrer or a proxy log.

### `GET /api/auth/callback`

1. **Reject if `state` does not match the cookie.** Clear the cookie either way, so a state can be used once.
2. Handle `?error=access_denied` — the user pressed Cancel. Redirect to a friendly page, do not show a stack
   trace.
3. Exchange the code at `POST https://discord.com/api/v10/oauth2/token`, form-encoded, with `client_id`,
   `client_secret`, `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier`.
4. `GET /users/@me` with `Authorization: Bearer …` → identity.
5. `GET /users/@me/guilds` → the guild list, cached on the session for a few minutes.
6. Create the session document. Set the cookies. 302 to `returnTo` if it is a **relative path on this origin**,
   otherwise to `/`. Never redirect to an absolute URL from the request — that is an open redirect.

### Sessions: server-side documents, not JWTs

```ts
// src/database/models/dashboardSession.schema.ts
{
	_id: string; // 32 random bytes, base64url — this is the cookie value
	userId: string;
	username: string;
	avatar: string | null;
	isOwner: boolean; // computed at login from env.DISCORD_OWNER_IDS
	csrfSecret: string;
	accessToken: string; // encrypted at rest
	refreshToken: string; // encrypted at rest
	tokenExpiresAt: Date;
	guildsCachedAt: Date | null;
	createdAt: Date;
	lastSeenAt: Date;
	expiresAt: Date; // TTL index — 7 days rolling
}
```

**Why not a JWT.** Revocation. If a session is compromised, or you kick someone out of the owner list, a
stateless token stays valid until it expires and there is nothing you can do about it. Deleting a document is
instant. The "extra database round trip" argument does not apply to a bot dashboard serving tens of requests a
minute against a database it is already connected to.

`isOwner` is snapshotted at login **and re-checked per request** against `env.DISCORD_OWNER_IDS`. The snapshot is
for rendering; the live check is the gate. Removing someone from the env and restarting must lock them out
immediately.

**Encrypt the Discord tokens at rest.** `node:crypto` AES-256-GCM with a key derived from
`DASHBOARD_SESSION_SECRET`. A leaked database dump otherwise hands over live OAuth tokens for every user who has
ever signed in. This is 20 lines and there is no excuse for skipping it.

### Cookies

| Cookie         | Flags                                                | Why                                                              |
| -------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `dash_session` | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7d` | The session id. HttpOnly so XSS cannot read it.                  |
| `dash_csrf`    | `Secure; SameSite=Lax; Path=/` — **readable**        | Double-submit token. The SPA reads it and echoes it in a header. |
| `dash_oauth`   | `HttpOnly; Secure; SameSite=Lax; Max-Age=600`        | In-flight OAuth state + PKCE verifier.                           |

`Secure` must be conditional on `NODE_ENV !== "development"`, or nothing works on `http://localhost`. That single
line is the most common self-hosting trip-up; call it out in the setup guide.

`SameSite=Lax` and not `Strict`: `Strict` would drop the cookie on the redirect back from Discord and the login
would silently fail. Not `None` — the whole point of same-origin serving is to avoid needing it.

**Nothing goes in `localStorage`.** No access token, no session id, no "remember me". An XSS bug in a dependency
should cost you a defaced page, not the bot.

### CSRF

`SameSite=Lax` blocks cross-site POSTs from forms, which covers most of it. Add double-submit anyway, because
`Lax` has exceptions and browsers change:

1. At login, generate `csrfSecret`, store it on the session, and set `dash_csrf` to it (readable).
2. The SPA's fetch wrapper reads the cookie and sends `x-csrf-token` on every `POST`/`PATCH`/`DELETE`.
3. Middleware compares header to session secret with `crypto.timingSafeEqual`. Mismatch → **403**, no detail.

GET requests are exempt, which means **no GET endpoint may mutate anything**. Worth stating because it is easy to
add a convenience `GET /api/guilds/:id/levelling/toggle` and reopen the hole.

### Refreshing and expiry

Discord access tokens last a week. Sessions roll: `lastSeenAt` updates on each request and `expiresAt` extends,
so an active user is never logged out mid-task. When `tokenExpiresAt` is within an hour and the guild list is
needed, refresh with the refresh token; if the refresh fails, delete the session and return 401 — the SPA then
shows the sign-in screen rather than an error.

An idle session dies after 7 days via the TTL index, with no cleanup job to write.

## Threat model

What an attacker gets, and what stops them.

| Threat                                        | Mitigation                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Stolen session cookie                         | `HttpOnly`, `Secure`, short TTL, `POST /api/auth/logout-all`, audit log                             |
| CSRF from another site                        | `SameSite=Lax` + double-submit token on every mutating verb                                         |
| XSS in the SPA                                | React escapes by default; no `dangerouslySetInnerHTML`; strict CSP; no token in JS-readable storage |
| OAuth code interception / login CSRF          | `state` compared against a cookie, single use; PKCE S256                                            |
| Open redirect via `returnTo`                  | Relative same-origin paths only, validated against a `^/[a-zA-Z0-9/_-]*$` allowlist                 |
| Privilege escalation to another guild         | Guild id comes **only** from the validated path param; never from a body                            |
| Stale permissions (demoted user still acting) | Live `permissions.has(ManageGuild)` on every request — `04-PERMISSIONS.md`                          |
| Brute force / scraping                        | Per-session and per-IP rate limits; 401s counted separately                                         |
| Leaked database dump                          | OAuth tokens encrypted with AES-256-GCM at rest                                                     |
| Dependency compromise in the SPA              | CSP without `unsafe-inline`; `npm audit` in CI; lockfile committed                                  |
| Someone finds the dashboard port on a VPS     | Off by default; documented reverse proxy + TLS; bind to localhost by default                        |

**Content-Security-Policy** to send with `index.html`:

```
default-src 'self';
img-src 'self' https://cdn.discordapp.com data:;
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self';
frame-ancestors 'none';
base-uri 'none';
form-action 'self'
```

`img-src` allows Discord's CDN for avatars and guild icons. `style-src 'unsafe-inline'` is needed because
Tailwind's runtime-injected styles and some Radix positioning use inline styles; tighten it with a nonce later if
you care to. `frame-ancestors 'none'` stops clickjacking, which matters when a single click can wipe a guild's
economy.

## Testing this

The parts worth testing are pure and easy:

- `state` mismatch → 403, and the cookie is cleared.
- `returnTo` of `https://evil.example` → redirects to `/`, not to evil.
- Missing CSRF header on a POST → 403.
- Expired session → 401 with a `WWW-Authenticate`-ish body the SPA can branch on.
- `isOwner` recomputed from env, not read from the document.

Each is a `app.request()` call against the Hono app with a stubbed Mongo — no server, no browser.
