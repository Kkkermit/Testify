# 03 — Metrics & Complete File Inventory

> Every figure on this page was produced by walking `src/` programmatically, not by estimation.
> `LOC` counts physical lines including blanks and comments.
>
> **Note on the line total.** `find src -name '*.js' | xargs cat | wc -l` reports **32,613**, but the true
> physical line count is **32,784**. `wc -l` counts newline characters, and **171 of the 321 files do not end
> with a trailing newline**, so their final line is never counted. The 171-line gap reconciles exactly
> (32,613 + 171 = 32,784). The missing trailing newlines are themselves a finding — add `insertFinalNewline`
> to the editor config and enforce it via Prettier in the rewrite.

## Totals

| Metric | Value |
|---|---:|
| JavaScript files under `src/` | 321 |
| Total lines | 32,784 |
| Mean file size | 102 lines |
| Largest file | src/commands/Community/clashRoyale.js (1301 lines) |
| Files over 300 lines | 16 |
| Files under 50 lines | 129 |

## By area

| Area | Files | Lines | % of codebase | Mean lines |
|---|---:|---:|---:|---:|
| `src/commands` | 103 | 14,137 | 43.1% | 137 |
| `src/events` | 55 | 7,799 | 23.8% | 142 |
| `src/prefix` | 67 | 4,599 | 14.0% | 69 |
| `src/__tests__` | 12 | 1,644 | 5.0% | 137 |
| `src/utils` | 20 | 1,208 | 3.7% | 60 |
| `src/scripts` | 10 | 982 | 3.0% | 98 |
| `src/api` | 3 | 618 | 1.9% | 206 |
| `src/schemas` | 32 | 495 | 1.5% | 15 |
| `src/(root)` | 2 | 253 | 0.8% | 127 |
| `src/functions` | 5 | 190 | 0.6% | 38 |
| `src/jobs` | 1 | 178 | 0.5% | 178 |
| `src/images` | 1 | 175 | 0.5% | 175 |
| `src/server` | 1 | 156 | 0.5% | 156 |
| `src/triggers` | 2 | 122 | 0.4% | 61 |
| `src/lib` | 4 | 116 | 0.4% | 29 |
| `src/client` | 3 | 112 | 0.3% | 37 |
| **Total** | **321** | **32,784** | **100%** | **102** |

## Codebase-wide pattern counts

These are the numbers that justify the consolidation work in the migration plan.

| Pattern | Occurrences | Why it matters for the rewrite |
|---|---:|---|
| `new EmbedBuilder(` | 459 | No shared embed factory — colour/footer/timestamp boilerplate is copy-pasted. |
| `catch (` blocks | 400 | Ad-hoc error handling; no central error boundary. |
| `console.*` calls | 298 | Competing with two bespoke loggers. |
| `ephemeral: true/false` | 158 | Deprecated in modern discord.js; must become `flags: MessageFlags.Ephemeral`. |
| `.then(` chains | 22 | Mixed with async/await in the same files. |
| Loose `==` comparisons | 19 | Fails `eqeqeq` lint; some are genuine null-coercion bugs. |
| `var` declarations | 5 | Legacy scoping. |
| Commented-out code lines | 98 | Dead code to delete rather than port. |
| `TODO`/`FIXME`/`HACK` markers | 0 | — |

## The 25 largest files

Every file in this table needs decomposition during the rewrite; none of them should survive as a single module.

| Lines | File | Embeds | Catches |
|---:|---|---:|---:|
| 1301 | `src/commands/Community/clashRoyale.js` | 12 | 15 |
| 883 | `src/events/EconCommandEvents/shopInteractions.js` | 12 | 3 |
| 752 | `src/events/CommandEvents/handleLogsEvent.js` | 34 | 34 |
| 726 | `src/commands/Community/dbd.js` | 6 | 8 |
| 700 | `src/commands/Economy/lottery.js` | 8 | 4 |
| 661 | `src/events/HelpCommandEvents/helpInteractions.js` | 10 | 0 |
| 583 | `src/events/EconCommandEvents/heistHandler.js` | 4 | 5 |
| 513 | `src/commands/Economy/gamble.js` | 4 | 0 |
| 509 | `src/commands/MiniGames/minigame.js` | 3 | 14 |
| 465 | `src/commands/Economy/account-info.js` | 2 | 2 |
| 401 | `src/events/ModPanelEvents/modPanelModalHandler.js` | 3 | 23 |
| 391 | `src/api/instagramApi.js` | 0 | 6 |
| 352 | `src/commands/Economy/treasureconfig.js` | 5 | 0 |
| 320 | `src/events/EconCommandEvents/petInteractions.js` | 3 | 3 |
| 318 | `src/utils/economyUtils/items/petItems.js` | 0 | 0 |
| 316 | `src/scripts/consoleLogger.js` | 0 | 2 |
| 283 | `src/commands/HardModeration/warn.js` | 7 | 1 |
| 283 | `src/commands/Valorant/valorantCommands.js` | 4 | 1 |
| 278 | `src/commands/LevelAndEconomy/leaderboard.js` | 0 | 5 |
| 276 | `src/prefix/Economy/account-info.js` | 1 | 0 |
| 270 | `src/commands/Economy/heist.js` | 2 | 4 |
| 270 | `src/commands/Economy/shop.js` | 1 | 0 |
| 270 | `src/events/EconCommandEvents/blackjackInteractions.js` | 1 | 1 |
| 255 | `src/commands/Economy/pet.js` | 4 | 0 |
| 254 | `src/commands/AuditLogging/auditLogging.js` | 6 | 0 |

## Full file inventory

Complete listing of all 321 files. `Exports` shows the detected module shape.

### `src/(root)` — 2 files, 253 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `config.js` | 127 | — | botVersion, prefix, status, eventListeners, botName, dev | — | — |
| `index.js` | 126 | — | — | — | discord.js, fs, dotenv |

### `src/__tests__` — 12 files, 1,644 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `impersonate.test.js` | 131 | — | — | — | — |
| `meme.test.js` | 192 | — | — | — | axios |
| `minecraft.test.js` | 219 | 🎮 Minecraft Skin Finder DevName | — | — | — |
| `translate.test.js` | 162 | — | — | — | @iamtraction/google-translate |
| `wiki.test.js` | 156 | Result | — | — | — |
| `counting.test.js` | 195 | counting | — | countingSystem | — |
| `bugReport.test.js` | 185 | Test Guild | — | — | discord.js |
| `suggestion.test.js` | 145 | Test Guild | — | — | discord.js |
| `economyMocks.js` | 62 | — | — | — | — |
| `emptyMock.js` | 9 | — | svg | — | — |
| `setup.js` | 36 | — | — | — | — |
| `testUtils.js` | 152 | — | — | — | discord.js |

### `src/api` — 3 files, 618 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `instagramApi.js` | 391 | — | — | — | node-fetch |
| `spotifyTrackerApi.js` | 53 | — | — | — | axios |
| `valorantApi.js` | 174 | — | — | — | axios |

### `src/client` — 3 files, 112 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `auditLogsClientEvent.js` | 9 | — | — | — | discord-logs |
| `distubeClientEvent.js` | 89 | — | — | — | distube, @distube/spotify, @distube/soundcloud, @distube/yt-dlp, discord.js |
| `giveawayClientEvent.js` | 14 | — | — | — | — |

### `src/commands` — 103 files, 14,137 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `aiCommands.js` | 244 | /ai | underDevelopment, usableInDms, category, data | aiChannelSystem | discord.js, apexify.js |
| `auditLogging.js` | 254 | /logs | usableInDms, category, permissions, data, if | auditLoggingSystem | discord.js |
| `automod.js` | 224 | /automod | usableInDms, category, permissions, data | — | discord.js |
| `advice.js` | 28 | /advice | usableInDms, category, data | — | discord.js, node-fetch |
| `animalFacts.js` | 36 | /animal-facts | usableInDms, category, data | — | discord.js, axios |
| `calculator.js` | 161 | /calculator | usableInDms, category, data | — | discord.js, mathjs |
| `clashRoyale.js` | 1301 | /clash-royale | usableInDms, category, data, if | — | discord.js, canvas, axios |
| `dbd.js` | 726 | /dbd | usableInDms, category, data, if | — | discord.js, node-fetch, canvas |
| `impersonate.js` | 38 | /impersonate | usableInDms, category, permissions, data | — | discord.js |
| `lyrics.js` | 56 | /lyrics | usableInDms, category, data | — | discord.js, superagent |
| `meme.js` | 62 | /meme | usableInDms, category, data, if | — | discord.js, axios |
| `minecraftInfo.js` | 118 | /minecraft | usableInDms, category, data | — | discord.js |
| `translate.js` | 75 | /translate | usableInDms, category, data | — | discord.js, @iamtraction/google-translate |
| `wiki.js` | 41 | /wiki | usableInDms, category, data | — | discord.js, wikijs |
| `countingSetup.js` | 63 | /counting | usableInDms, category, permissions, data | countingSystem | discord.js |
| `bugReport.js` | 90 | /bug-report | usableInDms, category, data | — | discord.js |
| `suggestion.js` | 68 | /suggest | usableInDms, category, data | — | discord.js |
| `account-info.js` | 465 | /economy-info | usableInDms, category, data | economySchema | discord.js |
| `balance.js` | 41 | /balance | usableInDms, category, data | economySchema | discord.js |
| `cooldowns.js` | 172 | /cooldowns | usableInDms, category, data | economySchema | discord.js |
| `create.js` | 75 | /economy | usableInDms, category, data | economySchema | discord.js |
| `daily.js` | 68 | /daily | usableInDms, category, data | economySchema | discord.js |
| `deposit.js` | 69 | /deposit | usableInDms, category, data | economySchema | discord.js |
| `gamble.js` | 513 | /gamble | usableInDms, category, data, if | economySchema | discord.js |
| `heist.js` | 270 | /heist | usableInDms, category, data | economySchema | discord.js |
| `inventory.js` | 183 | /inventory | usableInDms, category, data | economySchema | discord.js |
| `lottery.js` | 700 | /lottery | usableInDms, category, data | lotterySchema, economySchema | discord.js |
| `pet.js` | 255 | /pet | usableInDms, category, data | economySchema | discord.js |
| `rehome.js` | 64 | /rehome | usableInDms, category, data | economySchema | discord.js |
| `rob.js` | 159 | /rob | usableInDms, category, data | economySchema | discord.js |
| `shop.js` | 270 | /shop | usableInDms, category, data | economySchema | discord.js |
| `transfer.js` | 119 | /transfer | usableInDms, category, data | economySchema | discord.js |
| `treasureconfig.js` | 352 | /treasureconfig | usableInDms, category, data | treasureConfigSchema | discord.js |
| `use.js` | 190 | /use | usableInDms, category, data | economySchema | discord.js |
| `withdraw.js` | 69 | /withdraw | usableInDms, category, data | economySchema | discord.js |
| `work.js` | 77 | /work | usableInDms, category, data | economySchema | discord.js |
| `ascii.js` | 32 | /ascii | usableInDms, category, data | — | discord.js, figlet |
| `fakeTweet.js` | 25 | /fake-tweet | usableInDms, category, data | — | discord.js |
| `hackUser.js` | 98 | /hack | usableInDms, category, data | — | discord.js |
| `how.js` | 132 | /how | usableInDms, category, data | — | discord.js |
| `nitro.js` | 32 | /nitro | usableInDms, category, data | — | discord.js |
| `oogway.js` | 30 | /master-oogway | usableInDms, category, data | — | discord.js |
| `pepeSign.js` | 62 | /pepe-sign | usableInDms, category, data | — | discord.js, canvas |
| `relationshipChecker.js` | 50 | /relationship-checker | usableInDms, category, data | — | canvafy, discord.js |
| `giveaway.js` | 151 | /giveaway | usableInDms, category, permissions, data | — | discord.js, ms, discord-giveaways |
| `antiLink.js` | 133 | /anti-link | usableInDms, category, permissions, data | antiLinkSystem | discord.js |
| `ban.js` | 51 | /ban | usableInDms, category, permissions, data | — | discord.js |
| `kick.js` | 53 | /kick | usableInDms, category, permissions, data | — | discord.js |
| `lock.js` | 29 | /lock | usableInDms, category, permissions, data | — | discord.js |
| `modPanel.js` | 125 | /mod-panel | usableInDms, category, permissions, data | — | discord.js |
| `mute.js` | 79 | /mute | usableInDms, category, permissions, data | — | discord.js |
| `unban.js` | 45 | /unban | usableInDms, category, permissions, data | — | discord.js |
| `unlock.js` | 29 | /unlock | usableInDms, category, permissions, data | — | discord.js |
| `unmute.js` | 52 | /unmute | usableInDms, category, permissions, data | — | discord.js |
| `warn.js` | 283 | /warn | usableInDms, category, permissions, data | warningSystem | discord.js |
| `help.js` | 110 | /help | usableInDms, category, data | prefixSystem | discord.js |
| `avatar.js` | 100 | /avatar | usableInDms, category, data | — | discord.js |
| `botStats.js` | 67 | /bot | usableInDms, category, data | — | discord.js, os |
| `fixedBotsStats.js` | 94 | /bot-stats-channel | usableInDms, category, permissions, data | fixedBotsStatsSystem | discord.js, os |
| `memberCountGraph.js` | 65 | /member-count | usableInDms, category, data | — | discord.js, quickchart-js |
| `movieInfo.js` | 56 | /movie-tracker | usableInDms, category, data | — | discord.js, axios |
| `permissionTracker.js` | 40 | /permissions | usableInDms, category, data | — | discord.js |
| `roleInfo.js` | 47 | /role-info | usableInDms, category, data | — | discord.js |
| `serverInfo.js` | 130 | /server-info | usableInDms, category, data | — | discord.js |
| `userInfo.js` | 79 | /user-info | usableInDms, category, data | — | discord.js, discord-arts |
| `userInfoContextMenu.js` | 78 | /• User Info | usableInDms, category, data | — | discord.js, discord-arts |
| `instaNotification.js` | 134 | /insta-notification | usableInDms, category, permissions, data | instaNotificationSystem | discord.js |
| `give.js` | 130 | /give | usableInDms, category, permissions, data | economySystem, userLevelSystem, levelSetupSystem | discord.js |
| `leaderboard.js` | 278 | /leaderboard | usableInDms, category, data | userLevelSystem, economySystem | discord.js, canvafy, canvas |
| `reset.js` | 134 | /reset | usableInDms, category, permissions, data | userLevelSystem, economySystem, levelSetupSystem | discord.js |
| `levellingSystem.js` | 113 | /leveling-system | usableInDms, category, permissions, data | levelSetupSystem | discord.js |
| `rank.js` | 52 | /rank | usableInDms, category, data | userLevelSystem | discord.js, canvacord |
| `rankContextMenu.js` | 49 | /• Rank | usableInDms, category, data | userLevelSystem | discord.js, canvacord |
| `addEmojiAndSticker.js` | 100 | /add | usableInDms, category, permissions, data | — | discord.js, axios |
| `announcement.js` | 66 | /announce | usableInDms, category, permissions, data | — | discord.js |
| `autoRole.js` | 124 | /autorole | usableInDms, category, permissions, data | autoRoleSystem | discord.js |
| `botSendMessage.js` | 64 | /say | usableInDms, category, permissions, data | — | discord.js |
| `changeNickname.js` | 58 | /nick | usableInDms, category, permissions, data | — | discord.js |
| `clear.js` | 67 | /clear | usableInDms, category, permissions, data, if, while | — | discord.js |
| `createEmbedThread.js` | 150 | /create | usableInDms, category, permissions, data | — | discord.js |
| `role.js` | 66 | /role | usableInDms, category, permissions, data | — | discord.js |
| `slowMode.js` | 87 | /slow-mode | usableInDms, category, permissions, data | — | discord.js |
| `sticky.js` | 80 | /sticky-message | usableInDms, category, permissions, data | stickyMessageSystem | discord.js |
| `voiceChannelStats.js` | 142 | /members-vc | usableInDms, category, permissions, data | voiceChannelMembersSystem, voiceChannelBotSystem | discord.js |
| `welcomeSystem.js` | 70 | /welcome-system | usableInDms, category, permissions, data | welcomeSystem | discord.js |
| `fastType.js` | 55 | /fast-type | usableInDms, category, data | — | discord.js, discord-gamecord |
| `guessThePokemon.js` | 34 | /guess-the-pokemon | usableInDms, category, data | — | discord.js, discord-gamecord |
| `minigame.js` | 509 | /minigame | usableInDms, category, data | — | discord.js, discord-gamecord |
| `radio.js` | 63 | /radio | usableInDms, category, data | — | discord.js, @discordjs/voice |
| `textToSpeak.js` | 30 | /tts | usableInDms, category, permissions, data | — | discord.js |
| `testCommand.js` | 17 | /test | usableInDms, category, data | — | discord.js |
| `blacklist.js` | 88 | /blacklist | usableInDms, category, permissions, data | blacklistSystem | discord.js |
| `directMessage.js` | 43 | /direct-message | usableInDms, category, permissions, data | — | discord.js |
| `eval.js` | 65 | /eval | usableInDms, category, permissions, data | — | discord.js |
| `flushLogs.js` | 50 | /flush-logs | usableInDms, category, permissions, data | — | discord.js |
| `guildList.js` | 134 | /guild-list | usableInDms, category, permissions, data | — | discord.js |
| `prefixSettings.js` | 185 | /prefix | usableInDms, category, permissions, data | prefixSystem, prefixEnableSystem | discord.js |
| `profiles.js` | 159 | /profile | usableInDms, category, data | profileSystem | discord.js, moment |
| `profileViewContextMenu.js` | 56 | /• Profile View | usableInDms, category, data | profileSystem | discord.js, moment |
| `spotifyCommands.js` | 177 | /spotify | usableInDms, category, data | spotifyTrackerSystem | dotenv, discord.js, canvacord |
| `ticket.js` | 97 | /ticket | usableInDms, category, permissions, data | ticketSetupSystem | discord.js |
| `valorantCommands.js` | 283 | /valorant | usableInDms, category, data | valorantUserSystem | discord.js |
| `verify.js` | 75 | /verify | usableInDms, category, permissions, data | verifySystem | discord.js |

### `src/events` — 55 files, 7,799 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `checkSoftbans.js` | 75 | on:ClientReady once | name, once | softbanSystem | discord.js |
| `aiChannelEvent.js` | 59 | on:MessageCreate | name | aiChannelSystem | discord.js, apexify.js |
| `antiLinkEvent.js` | 69 | on:MessageCreate | name | antiLinkSystem, warningSystem | discord.js |
| `autoRoleEvent.js` | 17 | on:GuildMemberAdd | name | autoRoleSystem | discord.js |
| `countingEvent.js` | 78 | on:MessageCreate | name | countingSystem | discord.js |
| `createDefaultPrefixEvent.js` | 16 | on:GuildCreate | name | prefixSystem | discord.js |
| `dbdRerollEvent.js` | 223 | /random_perks_collage.png | name | — | discord.js, node-fetch, canvas |
| `evalEvent.js` | 250 | on:InteractionCreate | name | — | discord.js, fs, path, util |
| `guildMemberAddEvent.js` | 69 | on:GuildMemberAdd | name | welcomeSystem | discord.js, canvas |
| `handleLogsEvent.js` | 752 | — | — | auditLoggingSystem | discord.js |
| `instaNotificationEvent.js` | 62 | on:ClientReady | name | instaNotificationSystem | discord.js |
| `levellingEvent.js` | 73 | on:MessageCreate | name, if | userLevelSystem, levelSetupSystem | discord.js |
| `minecraftRefreshButtonEvent.js` | 96 | 🎮 How to Join | name | — | discord.js |
| `musicPrefixHandleEvent.js` | 30 | on:MessageCreate | name | — | discord.js |
| `spotifyButtonEvent.js` | 62 | on:InteractionCreate | name | spotifyTrackerSystem | discord.js |
| `spotifyTrackerEvent.js` | 41 | on:InteractionCreate | name | spotifyTrackerSystem | discord.js |
| `stickyMessageEvent.js` | 32 | on:MessageCreate | name | stickyMessageSystem | discord.js |
| `valorantSkinInfo.js` | 140 | on:InteractionCreate | name, if, switch | — | discord.js |
| `verifyRemoveEvent.js` | 29 | on:GuildMemberRemove | name | verifySystem, verifyUsersSystem | discord.js |
| `verifyUsersEvent.js` | 138 | on:InteractionCreate | name | verifySystem, verifyUsersSystem | discord.js, canvas |
| `prefixCommandLogging.js` | 47 | on:MessageCreate | name | — | discord.js |
| `slashCommandLogging.js` | 46 | on:InteractionCreate | name | — | discord.js |
| `blackjackInteractions.js` | 270 | on:InteractionCreate | name | economySchema | discord.js |
| `heistHandler.js` | 583 | on:InteractionCreate | name, if | economySchema | discord.js |
| `inventoryPagination.js` | 90 | on:InteractionCreate | name | — | discord.js |
| `itemAutocomplete.js` | 67 | ${item.emoji} ${item.name} (x${item.count}) | name | economySchema | discord.js |
| `lotteryInteractions.js` | 121 | on:InteractionCreate | name | lotterySchema, economySchema | discord.js |
| `petInteractions.js` | 320 | on:InteractionCreate | name | economySchema | discord.js |
| `randomMoneyEvent.js` | 117 | on:MessageCreate | name | economySchema, treasureConfigSchema | discord.js |
| `resetButtonHandler.js` | 124 | on:InteractionCreate | name | economySchema | discord.js |
| `shopInteractions.js` | 883 | on:InteractionCreate | name | economySchema | discord.js |
| `fixedBotStatsEvent.js` | 60 | on:ClientReady | name | fixedBotsStatsSystem | discord.js, os |
| `guildCreate.js` | 52 | on:GuildCreate | name, if | — | discord.js |
| `guildDelete.js` | 39 | on:GuildDelete | name, if | — | discord.js |
| `helpInteractions.js` | 661 | ${isSlash ?  | name | — | discord.js |
| `guildListPaginationEvent.js` | 181 | on:InteractionCreate | name | — | discord.js |
| `respondButtonEvent.js` | 93 | on:InteractionCreate | name | — | discord.js |
| `userInfoButtonEvent.js` | 213 | User Information for ${user.tag} | name | dmLoggerSystem | discord.js |
| `modPanelButtonHandler.js` | 128 | on:InteractionCreate | name | — | discord.js |
| `modPanelModalHandler.js` | 401 | Message Deletion | name | softbanSystem | discord.js |
| `directMessageLoggerEvent.js` | 105 | ${message.author.tag} sent a direct message! | name | dmLoggerSystem | discord.js |
| `passiveIncome.js` | 64 | on:ClientReady | name, once | economySchema | discord.js |
| `ready.js` | 35 | ready | name, once | — | mongoose |
| `setActivityEvent.js` | 29 | on:ClientReady | name | — | discord.js |
| `setBotStatusEvent.js` | 19 | on:ClientReady | name | — | discord.js |
| `interactionCreate.js` | 97 | interactionCreate | name | blacklistSystem | discord.js |
| `interactionErrorLoggingButton.js` | 109 | interactionCreate | name | — | discord.js |
| `messageCreate.js` | 116 | messageCreate | name | prefixEnableSystem, blacklistSystem | discord.js |
| `ticketAction.js` | 164 | on:InteractionCreate | name | ticketSetupSystem, ticketSystem | discord.js, discord-html-transcripts |
| `ticketManage.js` | 55 | on:InteractionCreate | name | ticketSystem | discord.js |
| `ticketResponse.js` | 113 | on:InteractionCreate | name | ticketSystem, ticketSetupSystem | discord.js |
| `totalBotsVoiceChannelAddEvent.js` | 22 | /• Total Bots: ${botsList} | name | voiceChannelBotSystem | discord.js |
| `totalBotsVoiceChannelRemoveEvent.js` | 22 | /• Total Bots: ${botsList1} | name | voiceChannelBotSystem | discord.js |
| `totalMembersVoiceChannelAddEvent.js` | 21 | /• Total Members: ${totalMembers} | name | voiceChannelMembersSystem | discord.js |
| `totalMembersVoiceChannelRemoveEvent.js` | 21 | /• Total Members: ${totalMembers1} | name | voiceChannelMembersSystem | discord.js |

### `src/functions` — 5 files, 190 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `handleCommands.js` | 66 | — | function | — | @discordjs/rest, discord-api-types/v10, fs, ascii-table |
| `handleEvents.js` | 17 | — | function | — | fs |
| `handlePrefix.js` | 45 | — | function | — | ascii-table, fs |
| `handleTriggers.js` | 12 | — | function | — | — |
| `processHandlers.js` | 50 | — | function | — | — |

### `src/images` — 1 files, 175 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `index.js` | 175 | /${filename}.png | getAttachment, getURL, getEditionURL, getAllAttachments, getDBDPerk, getDBDPerkAttachment | — | path, fs, discord.js, canvas |

### `src/jobs` — 1 files, 178 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `lotteryDrawJob.js` | 178 | — | — | lotterySchema, economySchema | discord.js |

### `src/lib` — 4 files, 116 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `addSuffix.js` | 13 | — | — | — | — |
| `asciiText.js` | 57 | — | — | — | — |
| `discordBadges.js` | 21 | — | — | — | — |
| `version.js` | 25 | — | — | — | axios |

### `src/prefix` — 67 files, 4,599 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `animalFacts.js` | 37 | animalfacts (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js, axios |
| `meme.js` | 62 | meme | name, usableInDms, description, usage, category | — | discord.js, axios |
| `account-info.js` | 276 | account-info (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `balance.js` | 39 | balance (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `cooldowns.js` | 169 | cooldowns (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `daily.js` | 63 | daily (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `deposit.js` | 62 | deposit (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `give.js` | 80 | give (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `heist.js` | 248 | heist (aliases) | name, aliases, description, usableInDms, usage, category | economySchema | discord.js |
| `leaderboard.js` | 222 | leaderboard-economy (aliases) | name, aliases, description, usableInDms, usage, category | economySchema | discord.js, canvas |
| `pet.js` | 210 | pet (aliases) | name, aliases, description, usableInDms, usage, category | economySchema | discord.js |
| `rehome.js` | 99 | rehome (aliases) | name, aliases, description, usableInDms, usage, category | economySchema | discord.js |
| `reset.js` | 70 | reset (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `rob.js` | 144 | rob (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `server-economy.js` | 166 | server-economy (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `transfer.js` | 106 | transfer (aliases) | name, aliases, description, usage, usableInDms, category | economySchema | discord.js |
| `withdraw.js` | 62 | withdraw (aliases) | name, aliases, description, usableInDms, usage, category | economySchema | discord.js |
| `work.js` | 72 | work (aliases) | name, aliases, description, usableInDms, usage, category | economySchema | discord.js |
| `ascii.js` | 32 | ascii (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js, figlet |
| `dadJoke.js` | 33 | dad-joke (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `iq.js` | 37 | iq (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `nitro.js` | 30 | nitro (aliases) | name, aliases, description, category, usage, usableInDms | — | — |
| `relationshipChecker.js` | 41 | relationship-checker (aliases) | name, aliases, description, usage, category, usableInDms | — | canvafy |
| `ban.js` | 53 | ban (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `kick.js` | 57 | kick (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `unban.js` | 41 | unban (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `updateGuildsPrefix.js` | 40 | change-prefix (aliases) | name, aliases, description, usage, category, usableInDms | prefixSystem | discord.js |
| `help.js` | 143 | help | name, description, category, usableInDms | prefixSystem | discord.js |
| `avatar.js` | 55 | avatar (aliases) | name, description, aliases, usage, category, usableInDms | — | discord.js |
| `botHardware.js` | 34 | bot-specs (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js, os |
| `botInfo.js` | 97 | bot-info (aliases) | name, aliases, description, usage, category, usableInDms | prefixSystem | discord.js |
| `memberCountGraph.js` | 63 | member-graph (aliases) | name, aliases, description, category, usage, usableInDms | — | discord.js, quickchart-js |
| `permissionTracker.js` | 37 | perms (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `roleInfo.js` | 74 | roleinfo (aliases) | name, description, usage, category, aliases, usableInDms | — | discord.js |
| `serverInfo.js` | 131 | server-info (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `uptime.js` | 33 | uptime (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `userInfo.js` | 71 | userinfo (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js, discord-arts |
| `leaderboard.js` | 56 | leaderboard (aliases) | name, aliases, category, description, usage, usableInDms | userLevelSystem | canvafy |
| `rank.js` | 51 | rank (aliases) | name, aliases, description, usage, category, usableInDms | userLevelSystem | discord.js, canvacord |
| `addRole.js` | 39 | addrole | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `changeNickname.js` | 33 | nick | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `clear.js` | 144 | clear (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `removeRole.js` | 34 | removerole (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `slowMode.js` | 105 | slowmode (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `autoplay.js` | 30 | autoplay (aliases) | name, inVoiceChannel, aliases, description, usage, category | — | discord.js |
| `filters.js` | 39 | filter (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `forward.js` | 43 | forward (aliases) | name, inVoiceChannel, aliases, description, usage, category | — | discord.js |
| `join.js` | 34 | join (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `leave.js` | 22 | leave (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `nowplaying.js` | 30 | nowplaying (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `pause.js` | 42 | pause (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `play.js` | 80 | play (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `playskip.js` | 26 | playskip (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `playtop.js` | 26 | playtop (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `previous.js` | 30 | previous (aliases) | name, inVoiceChannel, usableInDms, aliases, description, usage | — | discord.js |
| `queue.js` | 31 | queue (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `repeat.js` | 54 | repeat (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `resume.js` | 38 | resume (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `rewind.js` | 42 | rewind | name, inVoiceChannel, description, usage, category, usableInDms | — | discord.js |
| `seek.js` | 42 | seek | name, inVoiceChannel, description, usage, category, usableInDms | — | discord.js |
| `shuffle.js` | 30 | shuffle (aliases) | name, inVoiceChannel, aliases, description, usage, category | — | discord.js |
| `skip.js` | 38 | skip | name, inVoiceChannel, description, usage, category, usableInDms | — | discord.js |
| `skipto.js` | 44 | skipto (aliases) | name, inVoiceChannel, description, usage, category, aliases | — | discord.js |
| `stop.js` | 30 | stop (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `volume.js` | 36 | volume (aliases) | name, aliases, description, usage, category, inVoiceChannel | — | discord.js |
| `ping.js` | 22 | ping (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |
| `flushLogs.js` | 39 | flushlogs (aliases) | name, aliases, description, usage, category, usableInDms | — | discord.js |

### `src/schemas` — 32 files, 495 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `aiChannelSystem.js` | 9 | — | mongoose model | — | mongoose |
| `antiLinkSystem.js` | 8 | — | mongoose model | — | mongoose |
| `auditLoggingSystem.js` | 18 | — | mongoose model | — | mongoose |
| `autoRoleSystem.js` | 14 | — | mongoose model | — | mongoose |
| `blacklistSystem.js` | 8 | — | mongoose model | — | mongoose |
| `countingSystem.js` | 10 | — | mongoose model | — | mongoose |
| `dmLoggerSystem.js` | 12 | — | mongoose model | — | mongoose |
| `economySchema.js` | 42 | — | mongoose model | — | mongoose |
| `economySystem.js` | 16 | — | mongoose model | — | mongoose |
| `fixedBotsStatsSystem.js` | 10 | — | mongoose model | — | mongoose |
| `giveawaySystem.js` | 59 | — | mongoose model | — | mongoose |
| `instaNotificationSystem.js` | 10 | — | mongoose model | — | mongoose |
| `levelSetupSystem.js` | 11 | — | mongoose model | — | mongoose |
| `lotterySchema.js` | 41 | — | mongoose model | — | mongoose |
| `prefixEnableSystem.js` | 9 | — | mongoose model | — | mongoose |
| `prefixSystem.js` | 12 | — | mongoose model | — | mongoose |
| `profileSystem.js` | 15 | — | — | — | mongoose |
| `softbanSystem.js` | 16 | — | mongoose model | — | mongoose |
| `spotifyTrackerSystem.js` | 10 | — | mongoose model | — | mongoose |
| `stickyMessageSystem.js` | 11 | — | mongoose model | — | mongoose |
| `ticketSetupSystem.js` | 15 | — | mongoose model | — | mongoose |
| `ticketSystem.js` | 14 | — | mongoose model | — | mongoose |
| `treasureConfigSchema.js` | 17 | — | mongoose model | — | mongoose |
| `userLevelSystem.js` | 14 | — | mongoose model | — | mongoose |
| `valorantUserSystem.js` | 11 | — | mongoose model | — | mongoose |
| `verifyLeftUsersSystem.js` | 10 | — | mongoose model | — | mongoose |
| `verifySystem.js` | 11 | — | mongoose model | — | mongoose |
| `verifyUsersSystem.js` | 9 | — | mongoose model | — | mongoose |
| `voiceChannelBotSystem.js` | 8 | — | mongoose model | — | mongoose |
| `voiceChannelMembersSystem.js` | 8 | — | mongoose model | — | mongoose |
| `warningSystem.js` | 27 | — | mongoose model | — | mongoose |
| `welcomeSystem.js` | 10 | — | mongoose model | — | mongoose |

### `src/scripts` — 10 files, 982 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `bootMode.js` | 25 | — | — | — | fs, path, dotenv |
| `commitRunner.js` | 89 | — | — | — | child_process, readline |
| `consoleLogger.js` | 316 | — | setup, if, logger, flushLogs | — | node-fetch, fs, path, util |
| `linesOfCode.js` | 106 | — | — | — | fs, path |
| `postInstallation.js` | 23 | — | — | — | — |
| `setupEnvFile.js` | 82 | — | — | — | fs, path, readline |
| `setupLogs.js` | 132 | — | function | — | fs, path, discord.js |
| `updatePackages.js` | 41 | — | — | — | child_process, util |
| `wipeDatabase.js` | 119 | action | — | — | path, fs, mongoose, prompts |
| `ytdlUpdater.js` | 49 | — | — | — | child_process |

### `src/server` — 1 files, 156 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `server.js` | 156 | — | — | spotifyTrackerSystem | dotenv, express, axios, ngrok |

### `src/triggers` — 2 files, 122 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `mentionBot.js` | 61 | on:MessageCreate | name | prefixSystem, aiChannelSystem | discord.js |
| `sendBotName.js` | 61 | on:MessageCreate | name | prefixSystem, aiChannelSystem | discord.js |

### `src/utils` — 20 files, 1,208 lines

| File | Lines | Command / Event | Exports | Schemas touched | npm deps |
|---|---:|---|---|---|---|
| `dmCommandCheck.js` | 28 | — | — | — | discord.js |
| `underDevelopmentCheck.js` | 25 | — | — | — | discord.js |
| `createStatsEmbed.js` | 90 | — | — | — | discord.js, @napi-rs/canvas |
| `dbdPerkHelper.js` | 23 | — | — | — | — |
| `dailyPetIncomeBonus.js` | 50 | — | — | economySchema | — |
| `petItems.js` | 318 | Hamster | common, uncommon, rare | — | — |
| `shopItems.js` | 161 | Fishing Rod | items, houses, businesses, jobs | — | — |
| `lotteryUtils.js` | 31 | — | — | — | — |
| `errorLogging.js` | 67 | ${client.user.username} Command Error ${client.config.devBy} | — | — | discord.js |
| `fetchValorantApi.js` | 43 | — | — | — | node-fetch |
| `folderLoader.js` | 36 | — | — | — | fs, path, mongoose |
| `getMessagePrefix.js` | 23 | — | — | prefixSystem, prefixEnableSystem | — |
| `giveaway.js` | 20 | — | — | giveawaySystem | discord-giveaways |
| `helpCommandUtils.js` | 107 | — | — | — | — |
| `instagramAuthHelper.js` | 10 | — | getRandomUserAgent, createInstagramHeaders, instagramFetchWithRetry, delay, sessionManager | — | — |
| `intents.js` | 35 | — | — | — | discord.js |
| `loggingEffects.js` | 33 | — | — | — | — |
| `logs.js` | 53 | — | — | — | — |
| `setupLoggers.js` | 23 | — | — | — | — |
| `timeUtils.js` | 32 | — | — | — | — |
