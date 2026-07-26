# 13 — Deduplication Map

**46 of 67 prefix commands duplicate a slash command.** This page maps every pair to its single target
implementation. Collapsing these is the largest single line reduction available in the rewrite.

Target shape for every row: **one `SharedCommand` in `src/features/<feature>/commands/`**, exposed on both
surfaces via `surfaces: ['slash', 'prefix']` (see `migration/11-TYPED-CONTRACTS.md`).

---

## Group 1 — Direct 1:1 duplicates (31 pairs)

Same command, same behaviour, two implementations.

| Prefix file | Slash file | Target |
|---|---|---|
| `prefix/Economy/balance.js` | `commands/Economy/balance.js` | `features/economy/commands/balance.ts` |
| `prefix/Economy/deposit.js` | `commands/Economy/deposit.js` | `features/economy/commands/deposit.ts` |
| `prefix/Economy/withdraw.js` | `commands/Economy/withdraw.js` | `features/economy/commands/withdraw.ts` |
| `prefix/Economy/daily.js` | `commands/Economy/daily.js` | `features/economy/commands/daily.ts` |
| `prefix/Economy/work.js` | `commands/Economy/work.js` | `features/economy/commands/work.ts` |
| `prefix/Economy/rob.js` | `commands/Economy/rob.js` | `features/economy/commands/rob.ts` |
| `prefix/Economy/transfer.js` | `commands/Economy/transfer.js` | `features/economy/commands/transfer.ts` |
| `prefix/Economy/heist.js` | `commands/Economy/heist.js` | `features/economy/commands/heist.ts` |
| `prefix/Economy/pet.js` | `commands/Economy/pet.js` | `features/economy/commands/pet.ts` |
| `prefix/Economy/rehome.js` | `commands/Economy/rehome.js` | `features/economy/commands/rehome.ts` |
| `prefix/Economy/cooldowns.js` | `commands/Economy/cooldowns.js` | `features/economy/commands/cooldowns.ts` |
| `prefix/Fun/ascii.js` | `commands/Fun/ascii.js` | `features/fun/commands/ascii.ts` |
| `prefix/Fun/nitro.js` | `commands/Fun/nitro.js` | `features/fun/commands/nitro.ts` |
| `prefix/Fun/relationshipChecker.js` | `commands/Fun/relationshipChecker.js` | `features/fun/commands/relationship.ts` |
| `prefix/Community/meme.js` | `commands/Community/meme.js` | `features/community/commands/meme.ts` |
| `prefix/Community/animalFacts.js` | `commands/Community/animalFacts.js` | `features/community/commands/animalFacts.ts` |
| `prefix/HardModeration/ban.js` | `commands/HardModeration/ban.js` | `features/moderation/commands/ban.ts` |
| `prefix/HardModeration/kick.js` | `commands/HardModeration/kick.js` | `features/moderation/commands/kick.ts` |
| `prefix/HardModeration/unban.js` | `commands/HardModeration/unban.js` | `features/moderation/commands/unban.ts` |
| `prefix/Help/help.js` | `commands/Help/help.js` | `features/help/commands/help.ts` |
| `prefix/InfoCommands/avatar.js` | `commands/InfoCommands/avatar.js` | `features/info/commands/avatar.ts` |
| `prefix/InfoCommands/serverInfo.js` | `commands/InfoCommands/serverInfo.js` | `features/info/commands/serverInfo.ts` |
| `prefix/InfoCommands/userInfo.js` | `commands/InfoCommands/userInfo.js` | `features/info/commands/userInfo.ts` |
| `prefix/InfoCommands/roleInfo.js` | `commands/InfoCommands/roleInfo.js` | `features/info/commands/roleInfo.ts` |
| `prefix/InfoCommands/permissionTracker.js` | `commands/InfoCommands/permissionTracker.js` | `features/info/commands/permissions.ts` |
| `prefix/InfoCommands/memberCountGraph.js` | `commands/InfoCommands/memberCountGraph.js` | `features/info/commands/memberGraph.ts` |
| `prefix/LevelSystem/rank.js` | `commands/LevelSystem/rank.js` | `features/levelling/commands/rank.ts` |
| `prefix/LightModeration/clear.js` | `commands/LightModeration/clear.js` | `features/moderation/commands/clear.ts` |
| `prefix/LightModeration/slowMode.js` | `commands/LightModeration/slowMode.js` | `features/moderation/commands/slowmode.ts` |
| `prefix/LightModeration/changeNickname.js` | `commands/LightModeration/changeNickname.js` | `features/moderation/commands/nickname.ts` |
| `prefix/Owner/flushLogs.js` | `commands/Owner/flushLogs.js` | `features/owner/commands/flushLogs.ts` |

**Before merging, diff each pair.** They have drifted — the prefix versions were written later and in several
cases have different validation. `prefix/HardModeration/kick.js` reads `args[1]` where it should read `args[0]`
for an ID lookup; the slash version has no such bug. **Take the correct behaviour from whichever side has it,
per pair — do not assume the slash version is canonical.**

---

## Group 2 — Prefix command → slash *subcommand* (11 pairs)

These need the shared implementation to be the subcommand handler, with the prefix adapter routing to it.

| Prefix file | Slash equivalent | Target |
|---|---|---|
| `prefix/Economy/account-info.js` | `/economy-info acc-info` | `features/economy/commands/accountInfo.ts` |
| `prefix/Economy/server-economy.js` | `/economy-info server-info` | `features/economy/commands/serverEconomy.ts` |
| `prefix/Economy/leaderboard.js` | `/leaderboard economy` | `features/economy/commands/leaderboard.ts` |
| `prefix/LevelSystem/leaderboard.js` | `/leaderboard levels` | `features/levelling/commands/leaderboard.ts` |
| `prefix/Economy/give.js` | `/give currency` | `features/economy/commands/give.ts` |
| `prefix/Economy/reset.js` | `/reset currency`, `/reset all-currency` | `features/economy/commands/reset.ts` |
| `prefix/LightModeration/addRole.js` | `/role add` | `features/moderation/commands/role.ts` |
| `prefix/LightModeration/removeRole.js` | `/role remove` | `features/moderation/commands/role.ts` |
| `prefix/HardModeration/updateGuildsPrefix.js` | `/prefix change` | `features/settings/commands/prefix.ts` |
| `prefix/InfoCommands/uptime.js` | `/bot uptime` | `features/info/commands/bot.ts` |
| `prefix/InfoCommands/botHardware.js` | `/bot specs` | `features/info/commands/bot.ts` |

⚠️ **`prefix/Economy/give.js` and `reset.js` write through the legacy `economySystem` model**, while their
slash counterparts partly use `economySchema`. Resolve finding 36 (`04-AUDIT-FINDINGS.md`) *before* merging
these two rows, or the merge will bake the data bug in.

---

## Group 3 — Prefix-only, no slash equivalent (26 commands)

**These are not duplication — they are the prefix layer's reason to exist.** Removing the prefix surface would
delete all of this functionality.

| Commands | Note |
|---|---|
| **All 21 `prefix/Music/*`** — `play`, `skip`, `queue`, `volume`, `seek`, `filters`, `repeat`, `shuffle`, `pause`, `resume`, `stop`, `join`, `leave`, `nowplaying`, `autoplay`, `previous`, `playtop`, `playskip`, `skipto`, `forward`, `rewind` | `src/commands/Music/` contains only `/radio` and `/tts`. **All playback control is prefix-only.** |
| `prefix/Other/ping.js` | No `/ping` exists |
| `prefix/InfoCommands/botInfo.js` | `/bot` has only `uptime` and `specs` |
| `prefix/Fun/dadJoke.js` | — |
| `prefix/Fun/iq.js` | — |

**Recommendation:** during the rewrite, give all 26 `surfaces: ['slash', 'prefix']` so music finally gets a
slash surface. This is a feature addition, so treat it as optional scope — but the shared-core design makes it
nearly free once the commands are ported.

Conversely, ~90 slash commands have **no** prefix counterpart (tickets, giveaways, verification, automod, AI,
Valorant, Spotify, profiles, minigames, audit logging, counting, sticky messages, welcome, blacklist,
guild-list, eval, gamble, shop, inventory, lottery, treasureconfig). Leave these slash-only —
`surfaces: ['slash']`.

---

## Non-command duplication

| Duplicate | Files | Target |
|---|---|---|
| **Blacklist gate** | `interactionCreate.js` ≡ `messageCreate.js`, character-for-character | `core/middleware.ts` → `blacklistMiddleware` |
| **Permission gate** | same two files, verbatim | `core/middleware.ts` → `permissionMiddleware` |
| **DM check** | `checkDmUsability` / `checkMessageDmUsability` | `core/middleware.ts` → `dmMiddleware` |
| **Under-development check** | `checkUnderDevelopment` / `checkMessageUnderDevelopment` | `core/middleware.ts` |
| **Economy account lookup** | ~18 verbatim copies in `commands/Economy/`, ~43 sites total | `database/repositories/economyRepository.ts` → `getOrCreateAccount()` |
| **"No account yet" guard embed** | ~15 copies | one guard inside the repository helper |
| **Profanity filter** | 13 call sites, each with its own matching logic | `core/contentFilter.ts` → `containsProfanity()` |
| **Embed house style** | ~90 files; `devBy` 112×, `arrowEmoji` 106× | `ui/embeds.ts` → `embed()` — **~800 lines saved** |
| **The two triggers** | `mentionBot.js` / `sendBotName.js` are ~95% identical | one `features/misc/mentionHandler.ts` |
| **VC counter events** | 4 byte-identical files with `1`-suffixed variables | one handler, parameterised by schema + label |
| **Guild join/leave** | `guildCreate.js` / `guildDelete.js` share ~80% | one `guildLifecycle.ts` with a shared embed builder |
| **Help embeds** | 6 near-identical builders in `helpInteractions.js` | one `renderHelpPage()` |
| **Command logging** | `prefixCommandLogging.js` ≡ `slashCommandLogging.js` | one middleware; hoist the `WebhookClient` out of the hot path |
| **`getSlashCommandsByCategory` / `getPrefixCommandsByCategory`** | near-duplicates | one function over the unified registry |
| **`formatPerkName` / `formatPerkNameForImage`** | differ by one `replace()` | one function with a parameter |
| **Uptime computation** | 3+ copies | `ui/format.ts` → `formatUptime()` |
| **`getTimestamp()`** | 3 definitions | `core/logger.ts` |
| **Duration formatting** | `timeUtils.js` exists but only 5 files use it; ~20 sites inline the ms math | `ui/format.ts` + `config/constants.ts` |

---

## Estimated impact

| Source | Lines removed (approx.) |
|---|---|
| Embed factory (finding 56) | ~800 |
| 42 merged command pairs | ~2,500 |
| Economy repository (43 sites) | ~400 |
| Shared middleware pipeline | ~200 |
| Trigger / VC / guild-lifecycle merges | ~250 |
| Deleted dead code (`04-AUDIT-FINDINGS.md` §S9) | ~600 |
| **Total** | **~4,750 lines, ~15% of the codebase** |

Before typing overhead is added back. A realistic expectation is that the TypeScript version lands **near or
slightly below** the current 32,784 lines while doing more — the deduplication offsets the annotations.
