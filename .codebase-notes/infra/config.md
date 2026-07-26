# `src/config.js` — Configuration

**127 lines, ~110 keys.** A single flat `module.exports = { … }`, attached as `client.config` and read
**~976 times** — the most-referenced symbol in the codebase.

Full environment analysis in [`../06-ENVIRONMENT.md`](../06-ENVIRONMENT.md).

---

## Key groups

| Group | Keys | Notes |
|---|---|---|
| Bot identity | `botVersion`, `botName`, `dev`, `devBy`, `developers`, `prefix`, `status`, `eventListeners` | `devBy` is interpolated into **112** embed authors |
| Messages | `noPerms`, `ownerOnlyCommand`, `filterMessage` | `noPerms` is **declared twice** |
| Invites | `botInvite`, `botServerInvite` | `botInvite` has a hardcoded `client_id` |
| Embed colours | 17 keys (`embedColor`, `embedCommunity`, `embedModHard`, …) | Mix of named `ColorResolvable` strings and hex |
| Emojis | 9 keys + 6 music emojis + 8 Valorant emojis | ~30 hardcoded custom-emoji IDs |
| Channel IDs | `botLeaveChannel`, `botJoinChannel`, `commandErrorChannel`, `evalLogsChannel`, `dmLoggingChannel` | Hardcoded snowflakes |
| Ticket strings | ~38 keys | The largest group; effectively a copy file |
| AI models | 3 keys | Consumed by the unreachable `/ai` |

---

## Issues

| Issue | Detail |
|---|---|
| **Duplicate key `noPerms`** | Declared once as a plain string and again as a `(missingPerms) => string` function. The object literal silently discards the first. **TypeScript will error here — which is the correct outcome.** Keep the function. **Finding 81.** |
| **`developers` is a single string** | Used with `!==` at two call sites and with **`.includes()`** in `/eval` — which on a string performs *substring* matching. **Finding 27.** Should be `string[]`. |
| **Hardcoded IDs for one private guild** | The developer ID, five logging channel IDs and ~30 custom emoji are literals. **Self-hosters silently log into the original author's server, or get "unknown channel" errors, and see raw `<:name:id>` text instead of emoji.** **Finding 96.** |
| **`embedInfo` and `embedInsta` are identical** | Both `"LuminousVividPink"`. |
| **Untyped colours** | Should be `ColorResolvable`. |
| **`config.logging.webhookUrl` does not exist** | Yet `src/utils/setupLoggers.js` reads it as a fallback — permanently dead. |
| **`arrowEmoji` appears in 106 embed titles** | Part of the house style that the embed factory will absorb. |

---

## Rewrite target

Split by concern, and move anything deployment-specific into validated env:

```ts
// src/config/env.ts        — secrets + per-deployment IDs, schema-validated, throws at boot
// src/config/theme.ts      — colours + emoji, `as const`, typed ColorResolvable
// src/config/strings.ts    — the ~38 ticket strings and all user-facing copy (i18n-ready)
// src/config/constants.ts  — cooldowns, timeouts, limits (replacing ~20 raw ms literals)
// src/config/categories.ts — the Category enum replacing 20 free-form strings
```

```ts
export const theme = {
  colors: { economy: 'DarkOrange', moderation: 'DarkRed', /* … */ } satisfies Record<Category, ColorResolvable>,
  emoji:  { error: '❌', success: '☑️', arrow: '⤵', /* … */ },
} as const;
```

**Nothing that differs per deployment should remain a literal in source.** The five channel IDs and the
developer list move to `env.ts`; the custom emoji become configurable with sensible Unicode fallbacks so the
bot degrades gracefully in guilds that lack them.
