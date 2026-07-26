# 15 — File Mapping

Every one of the **321** JavaScript files in `src/` mapped to its target TypeScript path,
or marked for deletion. Generated from the measured inventory — no file is omitted.

Read alongside `13-DEDUPLICATION-MAP.md` (which pairs merge) and `10-TARGET-ARCHITECTURE.md`
(why the target tree is shaped this way).

## Summary

| Outcome | Files |
|---|---:|
| Ported to TypeScript | 309 |
| Deleted outright | 12 |
| Prefix files merged into a shared command | 42 |
| **Total accounted for** | **321** |

## Deletions

| File | Reason |
|---|---|
| `src/__tests__/mocks/emptyMock.js` | No moduleNameMapper; nothing references it |
| `src/commands/Other/testCommand.js` | A /test debug ping registered globally in production |
| `src/lib/asciiText.js` | Console banner art — fold into core/logger.ts startup output |
| `src/schemas/economySystem.js` | Duplicate model over the `economies` collection — finding 36 |
| `src/schemas/verifyLeftUsersSystem.js` | Zero consumers repo-wide |
| `src/scripts/postInstallation.js` | Stale guide; regenerate from the env schema |
| `src/scripts/setupLogs.js` | Patches node_modules — vendor the handler registration instead |
| `src/scripts/updatePackages.js` | Unbounded `npm install` loops belong to a human |
| `src/scripts/ytdlUpdater.js` | Runs `npm install` at runtime — finding 40 |
| `src/utils/economyUtils/dailyPetIncomeBonus.js` | Zero consumers; also an N+1 write pattern |
| `src/utils/folderLoader.js` | `loadFolder()` loads nothing; `if (mongoose.connect)` is always truthy |
| `src/utils/instagramAuthHelper.js` | Zero consumers — a pure passthrough re-export |

## Full mapping

### `src/(root)` — 2 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `config.js` | 127 | `src/config/{theme,strings,constants}.ts` |  |
| `index.js` | 126 | `src/index.ts` |  |

### `src/__tests__` — 12 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `__tests__/Community/impersonate.test.js` | 131 | `tests/impersonate.test.ts` | Vitest |
| `__tests__/Community/meme.test.js` | 192 | `tests/meme.test.ts` | Vitest |
| `__tests__/Community/minecraft.test.js` | 219 | `tests/minecraft.test.ts` | Vitest |
| `__tests__/Community/translate.test.js` | 162 | `tests/translate.test.ts` | Vitest |
| `__tests__/Community/wiki.test.js` | 156 | `tests/wiki.test.ts` | Vitest |
| `__tests__/Counting/counting.test.js` | 195 | `tests/counting.test.ts` | Vitest |
| `__tests__/Devs/bugReport.test.js` | 185 | `tests/bugReport.test.ts` | Vitest |
| `__tests__/Devs/suggestion.test.js` | 145 | `tests/suggestion.test.ts` | Vitest |
| `__tests__/fixtures/economyMocks.js` | 62 | `tests/economyMocks.test.ts` | Vitest |
| `__tests__/mocks/emptyMock.js` | 9 | `**DELETED**` | No moduleNameMapper; nothing references it |
| `__tests__/setup.js` | 36 | `tests/setup.test.ts` | Vitest |
| `__tests__/utils/testUtils.js` | 152 | `tests/testUtils.test.ts` | Vitest |

### `src/api` — 3 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `api/instagramApi.js` | 391 | `src/integrations/instagram/client.ts` |  |
| `api/spotifyTrackerApi.js` | 53 | `src/integrations/spotify/client.ts` |  |
| `api/valorantApi.js` | 174 | `src/integrations/valorant/api.ts` |  |

### `src/client` — 3 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `client/auditLogsClientEvent.js` | 9 | `src/features/settings/auditLogs/index.ts` |  |
| `client/distubeClientEvent.js` | 89 | `src/features/music/distube.ts` |  |
| `client/giveawayClientEvent.js` | 14 | `src/features/giveaway/manager.ts` |  |

### `src/commands` — 103 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `commands/AiCommands/aiCommands.js` | 244 | `src/features/ai/commands/aiCommands.ts` |  |
| `commands/AuditLogging/auditLogging.js` | 254 | `src/features/settings/commands/auditLogging.ts` |  |
| `commands/Automod/automod.js` | 224 | `src/features/settings/commands/automod.ts` |  |
| `commands/Community/advice.js` | 28 | `src/features/community/commands/advice.ts` |  |
| `commands/Community/animalFacts.js` | 36 | `src/features/community/commands/animalFacts.ts` | **merged** with the prefix twin |
| `commands/Community/calculator.js` | 161 | `src/features/community/commands/calculator.ts` |  |
| `commands/Community/clashRoyale.js` | 1301 | `src/features/community/commands/clashRoyale.ts` |  |
| `commands/Community/dbd.js` | 726 | `src/features/community/commands/dbd.ts` |  |
| `commands/Community/impersonate.js` | 38 | `src/features/community/commands/impersonate.ts` |  |
| `commands/Community/lyrics.js` | 56 | `src/features/community/commands/lyrics.ts` |  |
| `commands/Community/meme.js` | 62 | `src/features/community/commands/meme.ts` | **merged** with the prefix twin |
| `commands/Community/minecraftInfo.js` | 118 | `src/features/community/commands/minecraftInfo.ts` |  |
| `commands/Community/translate.js` | 75 | `src/features/community/commands/translate.ts` |  |
| `commands/Community/wiki.js` | 41 | `src/features/community/commands/wiki.ts` |  |
| `commands/Counting/countingSetup.js` | 63 | `src/features/settings/commands/countingSetup.ts` |  |
| `commands/Devs/bugReport.js` | 90 | `src/features/developer/commands/bugReport.ts` |  |
| `commands/Devs/suggestion.js` | 68 | `src/features/developer/commands/suggestion.ts` |  |
| `commands/Economy/account-info.js` | 465 | `src/features/economy/commands/account-info.ts` | **merged** with the prefix twin |
| `commands/Economy/balance.js` | 41 | `src/features/economy/commands/balance.ts` | **merged** with the prefix twin |
| `commands/Economy/cooldowns.js` | 172 | `src/features/economy/commands/cooldowns.ts` | **merged** with the prefix twin |
| `commands/Economy/create.js` | 75 | `src/features/economy/commands/create.ts` |  |
| `commands/Economy/daily.js` | 68 | `src/features/economy/commands/daily.ts` | **merged** with the prefix twin |
| `commands/Economy/deposit.js` | 69 | `src/features/economy/commands/deposit.ts` | **merged** with the prefix twin |
| `commands/Economy/gamble.js` | 513 | `src/features/economy/commands/gamble.ts` |  |
| `commands/Economy/heist.js` | 270 | `src/features/economy/commands/heist.ts` | **merged** with the prefix twin |
| `commands/Economy/inventory.js` | 183 | `src/features/economy/commands/inventory.ts` |  |
| `commands/Economy/lottery.js` | 700 | `src/features/economy/commands/lottery.ts` |  |
| `commands/Economy/pet.js` | 255 | `src/features/economy/commands/pet.ts` | **merged** with the prefix twin |
| `commands/Economy/rehome.js` | 64 | `src/features/economy/commands/rehome.ts` | **merged** with the prefix twin |
| `commands/Economy/rob.js` | 159 | `src/features/economy/commands/rob.ts` | **merged** with the prefix twin |
| `commands/Economy/shop.js` | 270 | `src/features/economy/commands/shop.ts` |  |
| `commands/Economy/transfer.js` | 119 | `src/features/economy/commands/transfer.ts` | **merged** with the prefix twin |
| `commands/Economy/treasureconfig.js` | 352 | `src/features/economy/commands/treasureconfig.ts` |  |
| `commands/Economy/use.js` | 190 | `src/features/economy/commands/use.ts` |  |
| `commands/Economy/withdraw.js` | 69 | `src/features/economy/commands/withdraw.ts` | **merged** with the prefix twin |
| `commands/Economy/work.js` | 77 | `src/features/economy/commands/work.ts` | **merged** with the prefix twin |
| `commands/Fun/ascii.js` | 32 | `src/features/fun/commands/ascii.ts` | **merged** with the prefix twin |
| `commands/Fun/fakeTweet.js` | 25 | `src/features/fun/commands/fakeTweet.ts` |  |
| `commands/Fun/hackUser.js` | 98 | `src/features/fun/commands/hackUser.ts` |  |
| `commands/Fun/how.js` | 132 | `src/features/fun/commands/how.ts` |  |
| `commands/Fun/nitro.js` | 32 | `src/features/fun/commands/nitro.ts` | **merged** with the prefix twin |
| `commands/Fun/oogway.js` | 30 | `src/features/fun/commands/oogway.ts` |  |
| `commands/Fun/pepeSign.js` | 62 | `src/features/fun/commands/pepeSign.ts` |  |
| `commands/Fun/relationshipChecker.js` | 50 | `src/features/fun/commands/relationshipChecker.ts` | **merged** with the prefix twin |
| `commands/Giveaway/giveaway.js` | 151 | `src/features/giveaway/commands/giveaway.ts` |  |
| `commands/HardModeration/antiLink.js` | 133 | `src/features/moderation/commands/antiLink.ts` |  |
| `commands/HardModeration/ban.js` | 51 | `src/features/moderation/commands/ban.ts` | **merged** with the prefix twin |
| `commands/HardModeration/kick.js` | 53 | `src/features/moderation/commands/kick.ts` | **merged** with the prefix twin |
| `commands/HardModeration/lock.js` | 29 | `src/features/moderation/commands/lock.ts` |  |
| `commands/HardModeration/modPanel.js` | 125 | `src/features/moderation/commands/modPanel.ts` |  |
| `commands/HardModeration/mute.js` | 79 | `src/features/moderation/commands/mute.ts` |  |
| `commands/HardModeration/unban.js` | 45 | `src/features/moderation/commands/unban.ts` | **merged** with the prefix twin |
| `commands/HardModeration/unlock.js` | 29 | `src/features/moderation/commands/unlock.ts` |  |
| `commands/HardModeration/unmute.js` | 52 | `src/features/moderation/commands/unmute.ts` |  |
| `commands/HardModeration/warn.js` | 283 | `src/features/moderation/commands/warn.ts` |  |
| `commands/Help/help.js` | 110 | `src/features/help/commands/help.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/avatar.js` | 100 | `src/features/info/commands/avatar.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/botStats.js` | 67 | `src/features/info/commands/botStats.ts` |  |
| `commands/InfoCommands/fixedBotsStats.js` | 94 | `src/features/info/commands/fixedBotsStats.ts` |  |
| `commands/InfoCommands/memberCountGraph.js` | 65 | `src/features/info/commands/memberCountGraph.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/movieInfo.js` | 56 | `src/features/info/commands/movieInfo.ts` |  |
| `commands/InfoCommands/permissionTracker.js` | 40 | `src/features/info/commands/permissionTracker.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/roleInfo.js` | 47 | `src/features/info/commands/roleInfo.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/serverInfo.js` | 130 | `src/features/info/commands/serverInfo.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/userInfo.js` | 79 | `src/features/info/commands/userInfo.ts` | **merged** with the prefix twin |
| `commands/InfoCommands/userInfoContextMenu.js` | 78 | `src/features/info/commands/userInfoContextMenu.ts` |  |
| `commands/InstaNotification/instaNotification.js` | 134 | `src/features/integrations/instagram/commands/instaNotification.ts` |  |
| `commands/LevelAndEconomy/give.js` | 130 | `src/features/economy/commands/give.ts` | **merged** with the prefix twin |
| `commands/LevelAndEconomy/leaderboard.js` | 278 | `src/features/economy/commands/leaderboard.ts` | **merged** with the prefix twin |
| `commands/LevelAndEconomy/reset.js` | 134 | `src/features/economy/commands/reset.ts` | **merged** with the prefix twin |
| `commands/LevelSystem/levellingSystem.js` | 113 | `src/features/levelling/commands/levellingSystem.ts` |  |
| `commands/LevelSystem/rank.js` | 52 | `src/features/levelling/commands/rank.ts` | **merged** with the prefix twin |
| `commands/LevelSystem/rankContextMenu.js` | 49 | `src/features/levelling/commands/rankContextMenu.ts` |  |
| `commands/LightModeration/addEmojiAndSticker.js` | 100 | `src/features/moderation/commands/addEmojiAndSticker.ts` |  |
| `commands/LightModeration/announcement.js` | 66 | `src/features/moderation/commands/announcement.ts` |  |
| `commands/LightModeration/autoRole.js` | 124 | `src/features/moderation/commands/autoRole.ts` |  |
| `commands/LightModeration/botSendMessage.js` | 64 | `src/features/moderation/commands/botSendMessage.ts` |  |
| `commands/LightModeration/changeNickname.js` | 58 | `src/features/moderation/commands/changeNickname.ts` | **merged** with the prefix twin |
| `commands/LightModeration/clear.js` | 67 | `src/features/moderation/commands/clear.ts` | **merged** with the prefix twin |
| `commands/LightModeration/createEmbedThread.js` | 150 | `src/features/moderation/commands/createEmbedThread.ts` |  |
| `commands/LightModeration/role.js` | 66 | `src/features/moderation/commands/role.ts` |  |
| `commands/LightModeration/slowMode.js` | 87 | `src/features/moderation/commands/slowMode.ts` | **merged** with the prefix twin |
| `commands/LightModeration/sticky.js` | 80 | `src/features/moderation/commands/sticky.ts` |  |
| `commands/LightModeration/voiceChannelStats.js` | 142 | `src/features/moderation/commands/voiceChannelStats.ts` |  |
| `commands/LightModeration/welcomeSystem.js` | 70 | `src/features/moderation/commands/welcomeSystem.ts` |  |
| `commands/MiniGames/fastType.js` | 55 | `src/features/minigames/commands/fastType.ts` |  |
| `commands/MiniGames/guessThePokemon.js` | 34 | `src/features/minigames/commands/guessThePokemon.ts` |  |
| `commands/MiniGames/minigame.js` | 509 | `src/features/minigames/commands/minigame.ts` |  |
| `commands/Music/radio.js` | 63 | `src/features/music/commands/radio.ts` |  |
| `commands/Music/textToSpeak.js` | 30 | `src/features/music/commands/textToSpeak.ts` |  |
| `commands/Other/testCommand.js` | 17 | `**DELETED**` | A /test debug ping registered globally in production |
| `commands/Owner/blacklist.js` | 88 | `src/features/owner/commands/blacklist.ts` |  |
| `commands/Owner/directMessage.js` | 43 | `src/features/owner/commands/directMessage.ts` |  |
| `commands/Owner/eval.js` | 65 | `src/features/owner/commands/eval.ts` |  |
| `commands/Owner/flushLogs.js` | 50 | `src/features/owner/commands/flushLogs.ts` | **merged** with the prefix twin |
| `commands/Owner/guildList.js` | 134 | `src/features/owner/commands/guildList.ts` |  |
| `commands/PrefixSettings/prefixSettings.js` | 185 | `src/features/settings/commands/prefixSettings.ts` |  |
| `commands/Profile/profiles.js` | 159 | `src/features/profile/commands/profiles.ts` |  |
| `commands/Profile/profileViewContextMenu.js` | 56 | `src/features/profile/commands/profileViewContextMenu.ts` |  |
| `commands/Spotify/spotifyCommands.js` | 177 | `src/features/integrations/spotify/commands/spotifyCommands.ts` |  |
| `commands/Tickets/ticket.js` | 97 | `src/features/tickets/commands/ticket.ts` |  |
| `commands/Valorant/valorantCommands.js` | 283 | `src/features/integrations/valorant/commands/valorantCommands.ts` |  |
| `commands/Verification/verify.js` | 75 | `src/features/settings/commands/verify.ts` |  |

### `src/events` — 55 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `events/ClientEvents/checkSoftbans.js` | 75 | `src/features/*/events/checkSoftbans.ts` | route by domain, not by folder |
| `events/CommandEvents/aiChannelEvent.js` | 59 | `src/features/*/events/aiChannelEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/antiLinkEvent.js` | 69 | `src/features/*/events/antiLinkEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/autoRoleEvent.js` | 17 | `src/features/*/events/autoRoleEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/countingEvent.js` | 78 | `src/features/*/events/countingEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/createDefaultPrefixEvent.js` | 16 | `src/features/*/events/createDefaultPrefixEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/dbdRerollEvent.js` | 223 | `src/features/*/events/dbdRerollEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/evalEvent.js` | 250 | `src/features/*/events/evalEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/guildMemberAddEvent.js` | 69 | `src/features/*/events/guildMemberAddEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/handleLogsEvent.js` | 752 | `src/features/settings/auditLogs/handlers/*.ts` | 752 lines / ~36 listeners — split by domain |
| `events/CommandEvents/instaNotificationEvent.js` | 62 | `src/features/*/events/instaNotificationEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/levellingEvent.js` | 73 | `src/features/*/events/levellingEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/minecraftRefreshButtonEvent.js` | 96 | `src/features/*/events/minecraftRefreshButtonEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/musicPrefixHandleEvent.js` | 30 | `src/features/*/events/musicPrefixHandleEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/spotifyButtonEvent.js` | 62 | `src/features/*/events/spotifyButtonEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/spotifyTrackerEvent.js` | 41 | `src/features/*/events/spotifyTrackerEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/stickyMessageEvent.js` | 32 | `src/features/*/events/stickyMessageEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/valorantSkinInfo.js` | 140 | `src/features/*/events/valorantSkinInfo.ts` | route by domain, not by folder |
| `events/CommandEvents/verifyRemoveEvent.js` | 29 | `src/features/*/events/verifyRemoveEvent.ts` | route by domain, not by folder |
| `events/CommandEvents/verifyUsersEvent.js` | 138 | `src/features/*/events/verifyUsersEvent.ts` | route by domain, not by folder |
| `events/CommandLoggingEvents/prefixCommandLogging.js` | 47 | `src/features/*/events/prefixCommandLogging.ts` | route by domain, not by folder |
| `events/CommandLoggingEvents/slashCommandLogging.js` | 46 | `src/features/*/events/slashCommandLogging.ts` | route by domain, not by folder |
| `events/EconCommandEvents/blackjackInteractions.js` | 270 | `src/features/economy/components/blackjackInteractions.ts` |  |
| `events/EconCommandEvents/heistHandler.js` | 583 | `src/features/economy/components/heistHandler.ts` |  |
| `events/EconCommandEvents/inventoryPagination.js` | 90 | `src/features/economy/components/inventoryPagination.ts` |  |
| `events/EconCommandEvents/itemAutocomplete.js` | 67 | `src/features/economy/components/itemAutocomplete.ts` |  |
| `events/EconCommandEvents/lotteryInteractions.js` | 121 | `src/features/economy/components/lotteryInteractions.ts` |  |
| `events/EconCommandEvents/petInteractions.js` | 320 | `src/features/economy/components/petInteractions.ts` |  |
| `events/EconCommandEvents/randomMoneyEvent.js` | 117 | `src/features/economy/components/randomMoneyEvent.ts` |  |
| `events/EconCommandEvents/resetButtonHandler.js` | 124 | `src/features/economy/components/resetButtonHandler.ts` |  |
| `events/EconCommandEvents/shopInteractions.js` | 883 | `src/features/economy/components/shopInteractions.ts` |  |
| `events/FixedBotStatsEvents/fixedBotStatsEvent.js` | 60 | `src/features/*/events/fixedBotStatsEvent.ts` | route by domain, not by folder |
| `events/GuildCreateDeleteEvents/guildCreate.js` | 52 | `src/features/*/events/guildCreate.ts` | route by domain, not by folder |
| `events/GuildCreateDeleteEvents/guildDelete.js` | 39 | `src/features/*/events/guildDelete.ts` | route by domain, not by folder |
| `events/HelpCommandEvents/helpInteractions.js` | 661 | `src/features/help/components/helpPages.ts` | 661 lines / 6 duplicate builders |
| `events/InteractionEvents/guildListPaginationEvent.js` | 181 | `src/features/*/events/guildListPaginationEvent.ts` | route by domain, not by folder |
| `events/InteractionEvents/respondButtonEvent.js` | 93 | `src/features/*/events/respondButtonEvent.ts` | route by domain, not by folder |
| `events/InteractionEvents/userInfoButtonEvent.js` | 213 | `src/features/*/events/userInfoButtonEvent.ts` | route by domain, not by folder |
| `events/ModPanelEvents/modPanelButtonHandler.js` | 128 | `src/features/moderation/components/modPanelButtonHandler.ts` |  |
| `events/ModPanelEvents/modPanelModalHandler.js` | 401 | `src/features/moderation/components/modPanelModalHandler.ts` |  |
| `events/ReadyEvents/directMessageLoggerEvent.js` | 105 | `src/features/*/events/directMessageLoggerEvent.ts` | route by domain, not by folder |
| `events/ReadyEvents/passiveIncome.js` | 64 | `src/features/*/events/passiveIncome.ts` | route by domain, not by folder |
| `events/ReadyEvents/ready.js` | 35 | `src/features/*/events/ready.ts` | route by domain, not by folder |
| `events/ReadyEvents/setActivityEvent.js` | 29 | `src/features/*/events/setActivityEvent.ts` | route by domain, not by folder |
| `events/ReadyEvents/setBotStatusEvent.js` | 19 | `src/features/*/events/setBotStatusEvent.ts` | route by domain, not by folder |
| `events/SlashAndPrefixCreateEvents/interactionCreate.js` | 97 | `src/core/{dispatcher,router,middleware}.ts` | the dispatch core |
| `events/SlashAndPrefixCreateEvents/interactionErrorLoggingButton.js` | 109 | `src/core/{dispatcher,router,middleware}.ts` | the dispatch core |
| `events/SlashAndPrefixCreateEvents/messageCreate.js` | 116 | `src/core/{dispatcher,router,middleware}.ts` | the dispatch core |
| `events/TicketEvents/ticketAction.js` | 164 | `src/features/tickets/components/ticketAction.ts` |  |
| `events/TicketEvents/ticketManage.js` | 55 | `src/features/tickets/components/ticketManage.ts` |  |
| `events/TicketEvents/ticketResponse.js` | 113 | `src/features/tickets/components/ticketResponse.ts` |  |
| `events/VcMemberAndBotCountEvents/totalBotsVoiceChannelAddEvent.js` | 22 | `src/features/settings/statChannels.ts` | 4 byte-identical files → 1 |
| `events/VcMemberAndBotCountEvents/totalBotsVoiceChannelRemoveEvent.js` | 22 | `src/features/settings/statChannels.ts` | 4 byte-identical files → 1 |
| `events/VcMemberAndBotCountEvents/totalMembersVoiceChannelAddEvent.js` | 21 | `src/features/settings/statChannels.ts` | 4 byte-identical files → 1 |
| `events/VcMemberAndBotCountEvents/totalMembersVoiceChannelRemoveEvent.js` | 21 | `src/features/settings/statChannels.ts` | 4 byte-identical files → 1 |

### `src/functions` — 5 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `functions/handleCommands.js` | 66 | `src/core/loader.ts + src/core/registry.ts` |  |
| `functions/handleEvents.js` | 17 | `src/core/loader.ts` |  |
| `functions/handlePrefix.js` | 45 | `src/core/loader.ts` |  |
| `functions/handleTriggers.js` | 12 | `src/core/loader.ts` |  |
| `functions/processHandlers.js` | 50 | `src/core/shutdown.ts` |  |

### `src/images` — 1 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `images/index.js` | 175 | `src/features/dbd/assets.ts (lazy, from assets/)` |  |

### `src/jobs` — 1 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `jobs/lotteryDrawJob.js` | 178 | `src/jobs/lotteryDraw.ts (+ overlap guard)` |  |

### `src/lib` — 4 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `lib/addSuffix.js` | 13 | `src/ui/format.ts` |  |
| `lib/asciiText.js` | 57 | `**DELETED**` | Console banner art — fold into core/logger.ts startup output |
| `lib/discordBadges.js` | 21 | `src/features/info/badges.ts` |  |
| `lib/version.js` | 25 | `src/core/version.ts (proper semver compare)` |  |

### `src/prefix` — 67 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `prefix/Community/animalFacts.js` | 37 | `src/features/community/commands/animalFacts.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Community/meme.js` | 62 | `src/features/community/commands/meme.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/account-info.js` | 276 | `src/features/economy/commands/account-info.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/balance.js` | 39 | `src/features/economy/commands/balance.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/cooldowns.js` | 169 | `src/features/economy/commands/cooldowns.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/daily.js` | 63 | `src/features/economy/commands/daily.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/deposit.js` | 62 | `src/features/economy/commands/deposit.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/give.js` | 80 | `src/features/economy/commands/give.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/heist.js` | 248 | `src/features/economy/commands/heist.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/leaderboard.js` | 222 | `src/features/economy/commands/leaderboard.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/pet.js` | 210 | `src/features/economy/commands/pet.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/rehome.js` | 99 | `src/features/economy/commands/rehome.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/reset.js` | 70 | `src/features/economy/commands/reset.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/rob.js` | 144 | `src/features/economy/commands/rob.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/server-economy.js` | 166 | `src/features/economy/commands/server-economy.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/transfer.js` | 106 | `src/features/economy/commands/transfer.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/withdraw.js` | 62 | `src/features/economy/commands/withdraw.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Economy/work.js` | 72 | `src/features/economy/commands/work.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Fun/ascii.js` | 32 | `src/features/fun/commands/ascii.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Fun/dadJoke.js` | 33 | `src/features/fun/commands/dadJoke.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Fun/iq.js` | 37 | `src/features/fun/commands/iq.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Fun/nitro.js` | 30 | `src/features/fun/commands/nitro.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Fun/relationshipChecker.js` | 41 | `src/features/fun/commands/relationshipChecker.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/HardModeration/ban.js` | 53 | `src/features/moderation/commands/ban.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/HardModeration/kick.js` | 57 | `src/features/moderation/commands/kick.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/HardModeration/unban.js` | 41 | `src/features/moderation/commands/unban.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/HardModeration/updateGuildsPrefix.js` | 40 | `src/features/moderation/commands/updateGuildsPrefix.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Help/help.js` | 143 | `src/features/help/commands/help.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/avatar.js` | 55 | `src/features/info/commands/avatar.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/botHardware.js` | 34 | `src/features/info/commands/botHardware.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/botInfo.js` | 97 | `src/features/info/commands/botInfo.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/InfoCommands/memberCountGraph.js` | 63 | `src/features/info/commands/memberCountGraph.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/permissionTracker.js` | 37 | `src/features/info/commands/permissionTracker.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/roleInfo.js` | 74 | `src/features/info/commands/roleInfo.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/serverInfo.js` | 131 | `src/features/info/commands/serverInfo.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/uptime.js` | 33 | `src/features/info/commands/uptime.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/InfoCommands/userInfo.js` | 71 | `src/features/info/commands/userInfo.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LevelSystem/leaderboard.js` | 56 | `src/features/levelling/commands/leaderboard.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LevelSystem/rank.js` | 51 | `src/features/levelling/commands/rank.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LightModeration/addRole.js` | 39 | `src/features/moderation/commands/addRole.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LightModeration/changeNickname.js` | 33 | `src/features/moderation/commands/changeNickname.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LightModeration/clear.js` | 144 | `src/features/moderation/commands/clear.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LightModeration/removeRole.js` | 34 | `src/features/moderation/commands/removeRole.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/LightModeration/slowMode.js` | 105 | `src/features/moderation/commands/slowMode.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |
| `prefix/Music/autoplay.js` | 30 | `src/features/music/commands/autoplay.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/filters.js` | 39 | `src/features/music/commands/filters.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/forward.js` | 43 | `src/features/music/commands/forward.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/join.js` | 34 | `src/features/music/commands/join.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/leave.js` | 22 | `src/features/music/commands/leave.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/nowplaying.js` | 30 | `src/features/music/commands/nowplaying.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/pause.js` | 42 | `src/features/music/commands/pause.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/play.js` | 80 | `src/features/music/commands/play.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/playskip.js` | 26 | `src/features/music/commands/playskip.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/playtop.js` | 26 | `src/features/music/commands/playtop.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/previous.js` | 30 | `src/features/music/commands/previous.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/queue.js` | 31 | `src/features/music/commands/queue.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/repeat.js` | 54 | `src/features/music/commands/repeat.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/resume.js` | 38 | `src/features/music/commands/resume.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/rewind.js` | 42 | `src/features/music/commands/rewind.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/seek.js` | 42 | `src/features/music/commands/seek.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/shuffle.js` | 30 | `src/features/music/commands/shuffle.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/skip.js` | 38 | `src/features/music/commands/skip.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/skipto.js` | 44 | `src/features/music/commands/skipto.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/stop.js` | 30 | `src/features/music/commands/stop.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Music/volume.js` | 36 | `src/features/music/commands/volume.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Other/ping.js` | 22 | `src/features/misc/commands/ping.ts` | prefix-only today; give it `surfaces: ['slash','prefix']` |
| `prefix/Owner/flushLogs.js` | 39 | `src/features/owner/commands/flushLogs.ts` | **merged** — see 13-DEDUPLICATION-MAP.md |

### `src/schemas` — 32 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `schemas/aiChannelSystem.js` | 9 | `src/database/models/aiChannel.ts` | interface + Schema<T> + model<T> |
| `schemas/antiLinkSystem.js` | 8 | `src/database/models/antiLink.ts` | interface + Schema<T> + model<T> |
| `schemas/auditLoggingSystem.js` | 18 | `src/database/models/auditLogging.ts` | interface + Schema<T> + model<T> |
| `schemas/autoRoleSystem.js` | 14 | `src/database/models/autoRole.ts` | interface + Schema<T> + model<T> |
| `schemas/blacklistSystem.js` | 8 | `src/database/models/blacklist.ts` | interface + Schema<T> + model<T> |
| `schemas/countingSystem.js` | 10 | `src/database/models/counting.ts` | interface + Schema<T> + model<T> |
| `schemas/dmLoggerSystem.js` | 12 | `src/database/models/dmLogger.ts` | interface + Schema<T> + model<T> |
| `schemas/economySchema.js` | 42 | `src/database/models/economy.ts` | interface + Schema<T> + model<T> |
| `schemas/economySystem.js` | 16 | `**DELETED**` | Duplicate model over the `economies` collection — finding 36 |
| `schemas/fixedBotsStatsSystem.js` | 10 | `src/database/models/fixedBotsStats.ts` | interface + Schema<T> + model<T> |
| `schemas/giveawaySystem.js` | 59 | `src/database/models/giveaway.ts` | interface + Schema<T> + model<T> |
| `schemas/instaNotificationSystem.js` | 10 | `src/database/models/instaNotification.ts` | interface + Schema<T> + model<T> |
| `schemas/levelSetupSystem.js` | 11 | `src/database/models/levelSetup.ts` | interface + Schema<T> + model<T> |
| `schemas/lotterySchema.js` | 41 | `src/database/models/lottery.ts` | interface + Schema<T> + model<T> |
| `schemas/prefixEnableSystem.js` | 9 | `src/database/models/prefixEnable.ts` | interface + Schema<T> + model<T> |
| `schemas/prefixSystem.js` | 12 | `src/database/models/prefix.ts` | interface + Schema<T> + model<T> |
| `schemas/profileSystem.js` | 15 | `src/database/models/profile.ts` | interface + Schema<T> + model<T> |
| `schemas/softbanSystem.js` | 16 | `src/database/models/softban.ts` | interface + Schema<T> + model<T> |
| `schemas/spotifyTrackerSystem.js` | 10 | `src/database/models/spotifyTracker.ts` | interface + Schema<T> + model<T> |
| `schemas/stickyMessageSystem.js` | 11 | `src/database/models/stickyMessage.ts` | interface + Schema<T> + model<T> |
| `schemas/ticketSetupSystem.js` | 15 | `src/database/models/ticketSetup.ts` | interface + Schema<T> + model<T> |
| `schemas/ticketSystem.js` | 14 | `src/database/models/ticket.ts` | interface + Schema<T> + model<T> |
| `schemas/treasureConfigSchema.js` | 17 | `src/database/models/treasureConfig.ts` | interface + Schema<T> + model<T> |
| `schemas/userLevelSystem.js` | 14 | `src/database/models/userLevel.ts` | interface + Schema<T> + model<T> |
| `schemas/valorantUserSystem.js` | 11 | `src/database/models/valorantUser.ts` | interface + Schema<T> + model<T> |
| `schemas/verifyLeftUsersSystem.js` | 10 | `**DELETED**` | Zero consumers repo-wide |
| `schemas/verifySystem.js` | 11 | `src/database/models/verify.ts` | interface + Schema<T> + model<T> |
| `schemas/verifyUsersSystem.js` | 9 | `src/database/models/verifyUsers.ts` | interface + Schema<T> + model<T> |
| `schemas/voiceChannelBotSystem.js` | 8 | `src/database/models/voiceChannelBot.ts` | interface + Schema<T> + model<T> |
| `schemas/voiceChannelMembersSystem.js` | 8 | `src/database/models/voiceChannelMembers.ts` | interface + Schema<T> + model<T> |
| `schemas/warningSystem.js` | 27 | `src/database/models/warning.ts` | interface + Schema<T> + model<T> |
| `schemas/welcomeSystem.js` | 10 | `src/database/models/welcome.ts` | interface + Schema<T> + model<T> |

### `src/scripts` — 10 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `scripts/bootMode.js` | 25 | `src/config/env.ts` |  |
| `scripts/commitRunner.js` | 89 | `scripts/commit.ts (fix the shell injection)` |  |
| `scripts/consoleLogger.js` | 316 | `src/core/logger.ts (webhook transport)` |  |
| `scripts/linesOfCode.js` | 106 | `scripts/codebaseInfo.ts` |  |
| `scripts/postInstallation.js` | 23 | `**DELETED**` | Stale guide; regenerate from the env schema |
| `scripts/setupEnvFile.js` | 82 | `scripts/setupEnv.ts (fix the lowercase webhook keys)` |  |
| `scripts/setupLogs.js` | 132 | `**DELETED**` | Patches node_modules — vendor the handler registration instead |
| `scripts/updatePackages.js` | 41 | `**DELETED**` | Unbounded `npm install` loops belong to a human |
| `scripts/wipeDatabase.js` | 119 | `scripts/wipeDatabase.ts` |  |
| `scripts/ytdlUpdater.js` | 49 | `**DELETED**` | Runs `npm install` at runtime — finding 40 |

### `src/server` — 1 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `server/server.js` | 156 | `src/server/index.ts (exported, not self-starting)` |  |

### `src/triggers` — 2 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `triggers/mentionBot.js` | 61 | `src/features/misc/mentionHandler.ts` | the two triggers are ~95% identical → 1 |
| `triggers/sendBotName.js` | 61 | `src/features/misc/mentionHandler.ts` | the two triggers are ~95% identical → 1 |

### `src/utils` — 20 files

| Current | Lines | Target | Note |
|---|---:|---|---|
| `utils/commandParams/dmCommandCheck.js` | 28 | `src/core/middleware.ts` |  |
| `utils/commandParams/underDevelopmentCheck.js` | 25 | `src/core/middleware.ts` |  |
| `utils/createStatsEmbed.js` | 90 | `src/features/integrations/spotify/embeds.ts` |  |
| `utils/dbdPerkHelper.js` | 23 | `src/integrations/dbd/perks.ts (Map-indexed)` |  |
| `utils/economyUtils/dailyPetIncomeBonus.js` | 50 | `**DELETED**` | Zero consumers; also an N+1 write pattern |
| `utils/economyUtils/items/petItems.js` | 318 | `src/features/economy/data/petItems.ts (as const)` |  |
| `utils/economyUtils/items/shopItems.js` | 161 | `src/features/economy/data/shopItems.ts (as const)` |  |
| `utils/economyUtils/lotteryUtils.js` | 31 | `src/features/economy/services/lottery.ts` |  |
| `utils/errorLogging.js` | 67 | `src/core/errors.ts` |  |
| `utils/fetchValorantApi.js` | 43 | `src/integrations/valorant/client.ts` |  |
| `utils/folderLoader.js` | 36 | `**DELETED**` | `loadFolder()` loads nothing; `if (mongoose.connect)` is always truthy |
| `utils/getMessagePrefix.js` | 23 | `src/database/repositories/guildSettingsRepository.ts (+ cache)` |  |
| `utils/giveaway.js` | 20 | `src/features/giveaway/manager.ts` |  |
| `utils/helpCommandUtils.js` | 107 | `src/features/help/service.ts` |  |
| `utils/instagramAuthHelper.js` | 10 | `**DELETED**` | Zero consumers — a pure passthrough re-export |
| `utils/intents.js` | 35 | `src/core/client.ts` |  |
| `utils/loggingEffects.js` | 33 | `src/core/logger.ts` |  |
| `utils/logs.js` | 53 | `src/core/logger.ts` |  |
| `utils/setupLoggers.js` | 23 | `src/core/logger.ts` |  |
| `utils/timeUtils.js` | 32 | `src/ui/format.ts` |  |
