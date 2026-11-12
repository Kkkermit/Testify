Contributions are welcome: code, translations, help articles, bug reports and ideas. Start with
[`docs/contributing.md`](https://github.com/Kkkermit/Testify/blob/main/docs/contributing.md), then
[`AGENTS.md`](https://github.com/Kkkermit/Testify/blob/main/AGENTS.md), which records how the code is built, the
conventions, and the decisions already made. Both apply to people and coding agents alike.

## Getting set up

```bash
git clone https://github.com/Kkkermit/Testify.git
cd Testify
nvm use                   # Node 24.11 or newer
npm ci
npm run setup -- --dev    # writes .env.development for a separate test bot
npm run dev               # the bot, restarting on every save
npm run dev:all           # the bot and the dashboard together
```

Use a separate test bot and a test server while you work, and set `DISCORD_DEV_GUILD_ID` so commands register in
that server only.

## The workflow

1. **Cut a branch from the latest `develop`,** named `testify/<type>-<nn>`, where the type is `feature`, `bugfix`,
   `chore` or `docs`.
2. **Run `npm run check` before you commit.** It runs the type check, the linter, the format check and the tests.
3. **Commit as `type: Capitalized subject`,** such as `fix: Stop the casino paying twice`. A hook checks it, and
   `npm run commit` writes one for you.
4. **Open the pull request against `develop`,** never `main`. CI runs on every push, with the tests on Windows.

`main` only takes the release pull request from `develop`, and each merge into `main` is a release: see
[Releases and updates](Releases-and-updates).

## Where things go

| To change…             | Look in                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| A command              | `src/commands/<category>/*.command.ts`: one file serves both slash and prefix |
| A button, menu or form | `src/buttons/`, with its message drawn in `src/lib/<domain>/`                 |
| What the bot says      | `src/config/strings.ts`, and `src/config/replies.ts` for the shared replies   |
| A database query       | `src/database/repositories/`: commands never use a model directly             |
| A dashboard screen     | `dashboard/src/features/<name>/`, with its API route in `src/api/routes/`     |
| A help article         | `assets/support/*.md`                                                         |
| Configuration          | `src/config/env.ts`, both `.env*.example` files and `scripts/setupEnv.ts`     |

[The codebase](https://testify.lol/docs/codebase) walks through the layout, and
[Adding a command](https://testify.lol/docs/adding-a-command) shows a whole command.

## Translating

- **The dashboard** reads `dashboard/src/i18n/locales/<language>.json`. English is the source, and a test names any
  key a language is missing.
- **Discord's command menus** read `assets/locales/commands/<language>.json`. Run `npm run i18n:commands` after
  changing a command, and the suite names every string still to translate.
- **A new language** is listed in [`docs/contributing.md`](https://github.com/Kkkermit/Testify/blob/main/docs/contributing.md#-translating-the-dashboard).

## Good to know

- **Some files are generated.** Never edit `docs/commands.md` by hand: run `npm run docs:commands`.
- **This wiki is generated too.** It's published from
  [`docs/wiki/`](https://github.com/Kkkermit/Testify/tree/main/docs/wiki), so change it there with a pull request.
  Edits made on GitHub's wiki pages are overwritten.
- **Everybody is held to the [code of conduct](https://github.com/Kkkermit/Testify/blob/main/docs/code-of-conduct.md).**
