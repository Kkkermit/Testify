<div align="center">

# 📸 Dashboard screenshots

**The screens the [root README](../../../README.md#️-the-web-dashboard) shows. Committed rather than hosted, so a
fork carries them.**

![Screens: 12](https://img.shields.io/badge/screens-12-8b5cf6?style=for-the-badge)
![Width: 1280px](https://img.shields.io/badge/width-1280px-0ea5e9?style=for-the-badge)
![Data: stubbed](https://img.shields.io/badge/data-stubbed-16a34a?style=for-the-badge)

</div>

> [!IMPORTANT]
> They are captured from the **built** dashboard against stub API responses — never a live install, so no real
> server, account or snowflake appears in one. The signed-in account renders as `you`, and the server as
> `Testify HQ`, for the same reason.

## 🖼️ The set

| File                | Route                              | Theme | Size       |
| ------------------- | ---------------------------------- | ----- | ---------- |
| `overview.png`      | `/guilds/:guildId`                 | dark  | viewport   |
| `guilds.png`        | `/guilds`                          | dark  | 640px tall |
| `levelling.png`     | `/guilds/:guildId/levelling`       | light | viewport   |
| `insights.png`      | `/guilds/:guildId/insights`        | dark  | whole page |
| `warnings.png`      | `/guilds/:guildId/warnings`        | light | whole page |
| `member.png`        | `/guilds/:guildId/members/:userId` | dark  | whole page |
| `status.png`        | `/status`                          | dark  | whole page |
| `casino.png`        | `/guilds/:guildId/casino`          | dark  | whole page |
| `settings.png`      | `/guilds/:guildId/settings`        | dark  | viewport   |
| `help.png`          | `/help`                            | light | 860px tall |
| `appearance.png`    | `/appearance`                      | light | viewport   |
| `owner-console.png` | `/owner?tab=usage`                 | dark  | viewport   |

Both themes appear on purpose: a reader deciding whether to run this should see that the light one is real rather
than an afterthought.

## 🔁 Retaking one

A screenshot that no longer matches the page is a document that lies, so retake the affected one whenever a screen
changes shape. This is a recipe rather than a script: adding Playwright to the repository would cost every
self-hoster a browser download for something only a maintainer runs.

1. **Build it.** `npm run build` — the screenshots are of the production bundle, not the dev server.
2. **Serve `dashboard/dist` statically**, with every path that has no file extension answered by `index.html`.
3. **Answer `/api/**` from the test stubs.** The handlers in `dashboard/src/test/handlers.ts` are the same fake
   data the test suite uses; MSW's `getResponse(handlers, request)` turns an intercepted request into a response
   outside a browser. Put any override first in the list — the first handler that matches wins.
4. **Set the theme before the page loads**, by writing `light` or `dark` to `localStorage` under `testify:theme`,
   and turn reduced motion on so the backdrop is not caught mid-drift.
5. **Load the route at 1280px wide** and wait for the network to settle. For a whole page, resize the viewport to
   the page's own height before the shot rather than using a full-page capture — the sidebar is as tall as the
   viewport, and a full-page capture leaves it stopping part-way down.

The bot's own card images are a different matter: they come from its renderers, and
`npm run docs:images` redraws every one of them into [`../../images/bot/`](../../images/bot).
