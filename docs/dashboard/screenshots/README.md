# Dashboard screenshots

The images the [root README](../../../README.md) embeds. Committed rather than hosted, so a fork carries them.

They are captured from the **built** dashboard against stub API responses — never a live install, so no real
server, account or snowflake appears in one. The signed-in account renders as `you` for the same reason.

## Retaking them

A screenshot that no longer matches the page is a document that lies, so retake the affected one whenever a
screen changes shape. The recipe, rather than a script: adding Playwright as a dependency to this repository
would cost every self-hoster a browser download for something only a maintainer runs.

1. `npm run build` — the screenshots are of the production bundle, not the dev server.
2. Serve `dashboard/dist` statically and intercept `/api/**` with stub responses.
3. Load each route at **1280px** wide, in the theme listed below, and wait for the network to settle.

| File                | Route                        | Theme |
| ------------------- | ---------------------------- | ----- |
| `overview.png`      | `/guilds/:guildId`           | dark  |
| `levelling.png`     | `/guilds/:guildId/levelling` | light |
| `settings.png`      | `/guilds/:guildId/settings`  | dark  |
| `owner-console.png` | `/owner?tab=usage`           | dark  |
| `appearance.png`    | `/appearance`                | light |

Both themes appear on purpose: a reader deciding whether to run this should see that the light one is real
rather than an afterthought.
