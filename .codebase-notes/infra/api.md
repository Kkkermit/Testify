# `src/api/` — External API Clients

**3 files · 620 lines.** Every response in all three is consumed **untyped**.

---

## `instagramApi.js` — 391 lines

`module.exports = new InstagramAPI()` — **a mutable singleton**.

An anti-bot scraping layer, not an official API client. Instance state: 7 user agents, a hardcoded
`IG_APP_ID`, two browser signatures generated at construction, a cookie session manager with a 3-hour TTL,
a per-username rate limiter (10 calls / 15 min), and a log rate limiter.

**Methods:** `generateUUID`, `generateRandomString`, `getRandomUserAgent`, `generateRealisticCookies`,
`createInstagramHeaders`, `delay`, `fetchWithRetry`, `fetchUserViaApi`, `fetchUserViaGraphQL`,
`fetchUserDirectPage`, `validateUser`, `getLatestPost`.

| Issue | Detail |
|---|---|
| **Undeclared `node-fetch`** | **Finding 13.** |
| **Two empty `if` bodies** | `if (this.logRateLimiter.shouldLog(…)) {}` — the limiter is computed and the branch does nothing. Dead code with a side effect. |
| **Mutates the caller's options** | `options.headers = …` inside the retry loop. |
| **Six `catch { return null }` blocks** | **Every failure mode collapses to `null`.** Callers cannot distinguish "user does not exist" from "rate limited" from "network down". |
| **Magic GraphQL hash** | A hardcoded `query_hash` that Instagram rotates without notice. |
| **Vestigial error tracking** | Computes and stores `lastErrorTime`, then never logs or reads it. |
| **Fragile by nature** | Scraping with rotated cookies and spoofed user agents breaks whenever Instagram changes. |

**Rewrite note.** Class fields interact with the `@babel/plugin-proposal-class-properties` already present.
Replace `node-fetch` with global `fetch`; introduce a discriminated result type
(`{ ok: true; data } | { ok: false; reason: 'not_found' | 'rate_limited' | 'network' }`) so the six `null`
returns become distinguishable. Consider whether this feature is worth maintaining at all — it is the most
brittle code in the repo.

---

## `spotifyTrackerApi.js` — 52 lines

`{ getTopItems(accessToken, type, timeRange = 'long_term') }`.

For `type === 'albums'` it fetches 50 top *tracks* and aggregates albums client-side, filtering
`total_tracks > 3`; otherwise it calls `/me/top/${type}` directly.

| Issue | Detail |
|---|---|
| **`catch (error) {}` — completely silent** | Returns `undefined` on expired tokens, 429s and network failures alike. `createStatsEmbed` then renders "No data available", **masking every real error**. |
| **No token refresh** | Despite `spotifyTrackerSystem` storing a `spotifyRefreshToken`. Once the access token expires, the feature silently stops working. |
| **Magic numbers** | `50`, `10`, `3` inline. |

---

## `valorantApi.js` — 174 lines

`module.exports = ValoAPI` (a class). Public: `initialize`, `getClientVersion`, `getStore`, `getWallet`,
`getUserUUID`, `getTokens`. Private: `#getEntitlementToken`, `#Formater`.

| Issue | Detail |
|---|---|
| **Dead cache** | Module-level `UserUUIDCache = new Map()` — written, never read. |
| **Duplicated tier UUIDs** | The same Riot UUIDs are hardcoded here *and* in `utils/fetchValorantApi.js` for pricing — two sources of truth. |
| **EU region hardcoded** | `baseURL = 'https://pd.eu.a.pvp.net/'`. **NA and AP users get wrong data.** |
| **`.catch(e => console.log(e))` then `res.data`** | Two sites. The catch converts a clean rejection into `TypeError: Cannot read properties of undefined`. |
| **`break` after `return`** | Two unreachable statements — `allowUnreachableCode: false` flags them. **Finding 83.** |
| **`let` inside `case` without a block** | Two sites — `no-case-declarations`. **Finding 82.** |
| **Untypeable return** | `#Formater` returns `string` for `'currency'` and `object[]` for `'store'`, keyed by a magic string. **Split into two methods.** |
| **Three naming conventions** | `snake_case` fields alongside `camelCase` and `PascalCase` locals, in one file. |
| **Hardcoded base64 client platform blob** | Will need rotating when Riot changes it. |
| **Plaintext tokens** | Access and entitlement tokens stored unencrypted. **Finding 18.** |

---

## Rewrite targets

```
src/integrations/
  instagram/  client.ts  types.ts
  spotify/    client.ts  types.ts  oauth.ts
  valorant/   api.ts     client.ts  types.ts  regions.ts
```

Cross-cutting changes for all three:

1. **Typed responses validated at the boundary with Zod** — these are third-party APIs that change without
   notice, and today every failure collapses to `null` or an unhandled `TypeError`.
2. **Discriminated result types** instead of `null`, so callers can react to rate limits differently from
   genuine 404s.
3. **Global `fetch`** — drop `node-fetch`, `superagent` and `axios`.
4. **Region as a parameter**, not a hardcoded EU constant.
5. **Token refresh** for Spotify, and encryption at rest for both Spotify and Riot tokens.
6. **Lazy initialisation** — the Valorant preload must never block `client.login()`. **Finding 46.**

The eight response interfaces to write are listed in
[`../migration/11-TYPED-CONTRACTS.md`](../migration/11-TYPED-CONTRACTS.md#8-external-api-response-types).
