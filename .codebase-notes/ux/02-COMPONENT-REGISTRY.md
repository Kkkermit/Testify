# 02 — Component Registry

**Every custom ID in the bot**, what mints it, and what handles it. Extracted from source, not recalled.

Use this when adding a component (to pick a free namespace), renaming one (to find every site), or porting a
feature (to know which handlers move with it).

**There is no such registry in the code.** IDs are string literals minted in one file and matched in another,
with nothing connecting them — which is why the collisions in §3 exist.

---

## 1. The registry

### Economy

| Custom ID | Type | Minted by | Handled by |
|---|---|---|---|
| `shop_nav_{items,houses,businesses,jobs,pets}` | button | `commands/Economy/shop.js` **and** `events/…/shopInteractions.js` | `shopInteractions.js` |
| `shop_select_{item,house,business,job}` | select | both of the above | `shopInteractions.js` |
| `shop_pet_category` | select | both of the above | `shopInteractions.js` |
| `shop_select_pet` | select | `shopInteractions.js` | `shopInteractions.js` |
| `shop_buy_item_<id>` | button | `shopInteractions.js` | `shopInteractions.js` |
| `shop_buy_house_<id>` | button | `shopInteractions.js` | `shopInteractions.js` |
| `shop_buy_business_<id>` | button | `shopInteractions.js` | `shopInteractions.js` |
| `shop_take_job_<id>` | button | `shopInteractions.js` | `shopInteractions.js` |
| `shop_adopt_pet_<id>` | button | `shopInteractions.js` | `shopInteractions.js` |
| `pet_check_<id>` | button | `shopInteractions.js` | `petInteractions.js` ⚠️ *also a dead branch in `shopInteractions.js`* |
| `pet_feed_<id>` · `pet_walk_<id>` | button | `commands/Economy/pet.js` | `petInteractions.js` |
| `rehome_confirm_<userId>` · `rehome_cancel_<userId>` | button | `commands/Economy/rehome.js` | `petInteractions.js` |
| `heist_join_<id>` · `heist_start_<id>` · `heist_cancel_<id>` | button | `commands/Economy/heist.js`, `prefix/Economy/heist.js` | `heistHandler.js` |
| `blackjack_hit` · `blackjack_stand` | button | `commands/Economy/gamble.js` | `blackjackInteractions.js` |
| `inventory_prev` · `inventory_next` | button | `commands/Economy/inventory.js` | `inventoryPagination.js` |
| `lottery_disable_confirm_<guildId>` · `lottery_disable_cancel_<guildId>` | button | `commands/Economy/lottery.js` | `lotteryInteractions.js` |
| `reset_user_confirm_<id>` · `reset_server_confirm_<id>` · `reset_cancel` | button | `commands/LevelAndEconomy/reset.js`, `prefix/Economy/reset.js` | `resetButtonHandler.js` |

### Moderation

| Custom ID | Type | Minted by | Handled by |
|---|---|---|---|
| `modpanel_<panelId>_<modId>_<targetId>_<action>` | button | `commands/HardModeration/modPanel.js` | `modPanelButtonHandler.js` |
| `modpanel_modal_<panelId>_<action>` | modal | `modPanelButtonHandler.js` | `modPanelModalHandler.js` |
| ↳ modal fields `reason` · `duration` · `deleteMessages` | text input | `modPanelButtonHandler.js` | `modPanelModalHandler.js` |

### Tickets

| Custom ID | Type | Minted by | Handled by |
|---|---|---|---|
| `ticket-close` · `-lock` · `-unlock` · `-manage` · `-claim` | button | `ticketResponse.js` | `ticketAction.js` |
| `ticket-manage-menu` | user select | `ticketAction.js` | `ticketManage.js` |
| *(arbitrary — read from `TicketSetup.Button` in the DB)* | button | `commands/Tickets/ticket.js` | `ticketResponse.js` ⚠️ see §3 |

### Help

| Custom ID | Type | Minted by | Handled by |
|---|---|---|---|
| `help_category_select` · `help_category_select_prefix` | select | `commands/Help/help.js`, `prefix/Help/help.js` | `helpInteractions.js` |
| `help_page_<…>` · `help_switch_<…>` | button | `helpInteractions.js` | `helpInteractions.js` |
| `help_back` · `help_back_prefix` | button | `helpInteractions.js` | `helpInteractions.js` |
| `switch_to_slash_help` · `switch_to_prefix_help` | button | both help commands | `helpInteractions.js` |

### Info & integrations

| Custom ID | Type | Minted by | Handled by |
|---|---|---|---|
| `userinfo-<userId>` | button | `directMessageLoggerEvent.js`, `commands/InfoCommands/userInfo.js` | `userInfoButtonEvent.js` |
| `back-<…>` | button | `userInfoButtonEvent.js` | `userInfoButtonEvent.js` ⚠️ unbounded — see §3 |
| `respond-<userId>` → modal `dm-response-<userId>` | button → modal | `directMessageLoggerEvent.js` | `respondButtonEvent.js` |
| `guildlist-<action>-<userId>` | button | `commands/Owner/guildList.js` | `guildListPaginationEvent.js` |
| `spotify-<type>-<userId>-<timeRange>` | button | `commands/Spotify/spotifyCommands.js` | `spotifyButtonEvent.js` ⚠️ collides — see §3 |
| `spotify-tracks` · `spotify-artists` · `spotify-albums` | button | `commands/Spotify/spotifyCommands.js` | `spotifyTrackerEvent.js` ⚠️ collides |
| `skin-preview_<type>_<uuid>_<idx>` · `skin-chroma_…` · `skin-level_…` | button | `commands/Valorant/valorantCommands.js` | `valorantSkinInfo.js` |
| `login-button` · `riot-login` · `accessTokenURL` · `codeInput` | button/modal | `commands/Valorant/valorantCommands.js` | *collector, same file* |
| `minecraft-refresh_<ip>` | button | `commands/Community/minecraftInfo.js` | `minecraftRefreshButtonEvent.js` |
| `dbd_reroll_<role>` | button | `commands/Community/dbd.js` | `dbdRerollEvent.js` |

### System & other

| Custom ID | Type | Minted by | Handled by |
|---|---|---|---|
| `evalModal` | modal | `commands/Owner/eval.js` | `evalEvent.js` |
| `eval_continue_<userId>` · `eval_cancel_<userId>` | button | `evalEvent.js` | `evalEvent.js` |
| `change_color_{yellow,green,red}_slash` | button | `utils/errorLogging.js` | `interactionErrorLoggingButton.js` |
| `verify` · `captchaenter` · `vermodal` | button/modal | `commands/Verification/verify.js`, `verifyUsersEvent.js` | `verifyUsersEvent.js` ⚠️ unnamespaced |
| `report` | button | `triggers/*` | — |
| `avatar` · `banner` · `delete` | button | `commands/InfoCommands/avatar.js` | *collector, same file* |
| `say` | modal | `commands/LightModeration/botSendMessage.js` | *`awaitModalSubmit`, same file* |
| `option1` · `option2` | button | `commands/MiniGames/minigame.js` | *collector, same file* |
| `refresh` | button | `prefix/InfoCommands/botInfo.js` | *leaked collector, same file* ⚠️ |
| `log_selection` | select | `commands/AuditLogging/auditLogging.js` | *collector, same file* |

---

## 2. Separator conventions — three of them

| Convention | Used by | Count |
|---|---|---|
| **`_` underscore** | shop, pet, heist, blackjack, inventory, lottery, reset, modpanel, help, eval, dbd, change_color | majority |
| **`-` hyphen** | ticket, userinfo, back, respond, guildlist, spotify, minecraft-refresh | ~8 namespaces |
| **Mixed** | `skin-preview_<type>_<uuid>` · `minecraft-refresh_<ip>` | 2 namespaces |
| **None** | `verify`, `captchaenter`, `vermodal`, `refresh`, `report`, `avatar`, `banner`, `delete`, `say`, `option1`, `option2`, `log_selection` | 12 IDs |

The mixed cases are the worst: `valorantSkinInfo.js` matches on `skin-` then splits on `_`, so the parsing
logic has to know both conventions for one ID.

---

## 3. Known collisions and hazards

| # | Issue | Detail |
|---|---|---|
| 1 | **`spotify-*` double-claim** | For customId exactly `spotify-tracks`, **both** `spotifyTrackerEvent.js` (exact match) and `spotifyButtonEvent.js` (`startsWith('spotify-')`) fire. The latter destructures `userId = undefined`, `users.fetch(undefined)` rejects, and its catch calls `reply()` after the former already called `update()` → **`InteractionAlreadyReplied`**. *(Audit finding 12.)* |
| 2 | **`back-` is an unbounded land-grab** | `userInfoButtonEvent.js` claims **every** custom ID bot-wide beginning `back-`. Any future feature using a `back-` prefix is captured by it. |
| 3 | **DB-supplied IDs can shadow built-ins** | `ticketResponse.js` matches against `TicketSetup.Button`, a **string a guild admin chooses**. An admin can register a button ID identical to any built-in and intercept it. |
| 4 | **12 unnamespaced IDs** | `verify`, `captchaenter`, `vermodal`, `refresh`, `report`, `avatar`, `banner`, `delete`, `say`, `option1`, `option2`, `log_selection` will collide with anything added later. |
| 5 | **Dead branch** | `shopInteractions.js` handles `pet_check_` behind a `startsWith('shop_')` guard — unreachable. |
| 6 | **No length guard** | `modpanel_<panelId>_<modId>_<targetId>_<action>` interpolates three snowflakes and reaches ~80 characters. **Discord's limit is 100** and nothing checks it. |
| 7 | **Nav row minted in two files** | `shop_nav_*` is built identically in `shop.js` and `shopInteractions.js` — ~30 lines to keep in sync manually. |

---

## 4. Namespace allocation for the rewrite

Proposed namespaces for the typed codec (`ns:action:...args`, one separator). Registering two handlers for the
same namespace **throws at boot**, which turns hazard #1 into a startup error instead of a production crash.

| Namespace | Covers |
|---|---|
| `shop` | Catalogue browsing and purchases |
| `pet` | Feed, walk, check, rehome |
| `heist` | Lobby join/start/cancel |
| `bj` | Blackjack |
| `inv` | Inventory pagination |
| `lottery` | Lottery config and disable |
| `econ` | Reset, transfer, quick amounts |
| `modpanel` | Moderation panel and its modals |
| `ticket` | Ticket lifecycle |
| `help` | Help navigation |
| `userinfo` | User info and its back navigation |
| `guildlist` | Guild list pagination |
| `spotify` | **One** handler — resolves collision #1 |
| `valorant` | Skins, store, login |
| `mc` | Minecraft server refresh |
| `dbd` | Dead by Daylight reroll |
| `verify` | Verification captcha and modal |
| `eval` | Eval modal and confirmation |
| `errtriage` | Error-triage colour buttons |
| `music` | **New** — control panel and queue browser (see `05-FEATURE-BLUEPRINTS.md`) |
| `settings` | **New** — config panels for treasure, lottery, welcome, automod |

**Rule:** a namespace is owned by exactly one feature module, and its handler lives beside the commands that
mint it. That co-location is the thing missing today — `shop_*` is minted in `commands/Economy/shop.js` and
handled 883 lines away in `events/EconCommandEvents/shopInteractions.js`.
