<div align="center">

# 🎨 Make it your own

**Your copy of Testify, with your name, your links and your prefix, and still easy to update.**

[What follows by itself](#-what-follows-the-bot-by-itself) · [`testify.config.json`](#️-testifyconfigjson) ·
[What takes code](#️-what-takes-code) · [Keeping a fork up to date](#-keeping-a-fork-up-to-date)

</div>

Testify is meant to be copied. Most of what makes a copy yours needs no code at all: the bot's name and picture come
from Discord, `.env` holds the secrets and the switches, and `testify.config.json` holds everything else that a
person reading your bot sees, from the link to your source code to who people should ask about their data.

---

## ✨ What follows the bot by itself

- **The name and the picture.** Everything the bot shows — its embeds, the website, the dashboard, link previews in
  Discord — uses the bot's own Discord username, avatar, banner and accent colour. Change them in the
  [Developer Portal](https://discord.com/developers/applications) and every surface follows on its next read. There
  is no name setting to keep in step.
- **The invite and the commands.** The invite link and every command's registration come from your own
  application ID, so nothing points at the original bot.

## ⚙️ `testify.config.json`

The file sits beside `.env` and holds nothing secret. Every key is optional, and anything you leave out keeps the
original's value, so a copy without the file behaves exactly as it always did. Two ways to make one:

```bash
npm run setup                                          # answer "Make it your own?" at the end
cp testify.config.example.json testify.config.json     # or copy the example and edit it
```

| Key             | What it does                                                                            | When you leave it out         |
| --------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| `repository`    | Your fork on GitHub. The website's source browser shows it; Source code buttons open it | The original repository       |
| `supportServer` | Where Support buttons lead. `null` hides them, so nobody is sent to somebody else's     | The original's support server |
| `developer`     | Who `/bot info` names as the developer                                                  | The original author           |
| `operator`      | Who runs this copy and how to reach them, shown on the privacy notice and the terms     | Nobody is named               |
| `defaultPrefix` | The prefix a server starts with until it picks its own                                  | `t?`                          |
| `greetInviter`  | Whether whoever adds the bot to a server gets a getting-started message                 | `true`                        |

A filled-in one looks like this:

```json
{
	"$schema": "./testify.config.schema.json",
	"repository": "https://github.com/you/your-fork",
	"supportServer": "https://discord.gg/your-invite",
	"developer": "You",
	"operator": { "name": "Your name or organisation", "contact": "privacy@example.com" },
	"defaultPrefix": "!"
}
```

A few things worth knowing:

- **Your editor checks it as you type.** The `$schema` line points at `testify.config.schema.json`, so VS Code and
  most other editors complete the keys and underline a mistake.
- **It is read once, at start-up.** Restart the bot after changing it. A mistake stops the start with a list of
  every problem, and an unknown key is one of them, so a misspelt setting never quietly does nothing.
- **One file, however the bot runs.** `npm run dev` and `npm start` both read `testify.config.json`; only `.env` is
  split in two.
- **In Docker it sits beside `.env` too.** `docker-compose.yml` mounts the folder it runs from, read-only, so the bot
  finds the file there, and a missing one simply means the defaults. See [Docker](hosting.md).
- **On Railway, commit it, or put it on a volume.** A host that builds from your repository finds nothing that git
  does not have. [Your settings on Railway](hosting.md#your-settings-on-railway) has both ways.
- **It is ignored by git, like `.env`.** `git add -f testify.config.json` commits it anyway, and git keeps tracking it
  from then on.

### The operator

If people other than you use your bot, say who runs it. The privacy notice tells people to ask the operator about
their data and about a blacklist entry; with `operator` set, both the privacy notice and the terms open with a card
naming you and linking your contact, which is an email address or an `https://` page. Where the GDPR or the UK GDPR
applies, the operator is the controller of the data, and has to be identifiable.

### The default prefix

A server that has never chosen a prefix follows `defaultPrefix`, so changing it reaches every one of them on the
next restart. A server that chose its own keeps it, and the prefix panel's Reset moves it back to yours. One catch
for a copy that ran an older version: a server's prefix could be saved before this setting existed even when the
server never chose one, and those keep what was saved until someone presses Reset.

### The getting-started message

When the bot joins a server, it sends whoever added it one direct message: how to see what it can do, where to set
it up — the dashboard's setup checklist when the dashboard is on — and how to change the prefix. It finds that
person the same way whether they used an invite link, the Add App button on the bot's profile or the App Directory:
the server's audit log records who added the bot, the bot's own integration records it too for a bot not given View
Audit Log, and the server's owner gets it when neither says. Closed direct messages are left alone, bots and
blacklisted accounts get nothing, and `"greetInviter": false` turns it off.

## 🛠️ What takes code

Everything else is a small number of files, chosen so that a change to them rarely meets a change from upstream:

| To change                                  | Edit                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| The colour of each category's embeds       | `src/config/theme.ts`, the only place a colour is written                                        |
| The emoji the bot uses                     | `src/config/theme.ts`                                                                            |
| The dashboard's colours, corners and fonts | `dashboard/src/index.css`, whose `@theme` tokens are the whole palette                           |
| What the bot says                          | `src/config/strings.ts`; the refusals every command shares are `src/config/replies.ts`           |
| What the dashboard says                    | `dashboard/src/i18n/locales/*.json`, one file per language                                       |
| The help articles `/ask` answers with      | `assets/support/*.md`                                                                            |
| A command of your own                      | A new file under `src/commands/` — see [Adding a command](../README.md#️-adding-your-own-command) |

Switching whole features off needs no code either: `DISABLED_FEATURES` in `.env` takes them out of Discord, the
dashboard and the docs. [Switching off a whole feature](articles/switching-features-off.md) explains how.

## 🔄 Keeping a fork up to date

Every release is tagged `release/vX.Y.Z`, and `main` is always the newest release. `develop` is work in progress, so
never merge it into a copy people use.

```bash
git remote add upstream https://github.com/Kkkermit/Testify.git   # once
git fetch upstream --tags
git merge release/v2.5.0                                          # the release you want
npm ci && npm run check
```

Merging stays easy when your changes stay in a few places:

- **Put your settings in `testify.config.json` rather than in code**, and your links never conflict at all.
- **Add commands as new files** rather than editing the original ones; a new file cannot conflict.
- **Keep visual changes to `theme.ts` and `index.css`**, so a conflict, when there is one, is in a file you know.
- **Read a release's "Before you upgrade"** on the [releases page](https://github.com/Kkkermit/Testify/releases)
  before merging it.

Running the published Docker image needs no fork at all: `.env` and `testify.config.json` beside the compose files
are the whole of your copy, and `TESTIFY_TAG` in `.env` pins the release you run.

## ⚖️ The licence

Testify is MIT-licensed. Use it, change it, rename it and run it as your own; the one condition is that
[`LICENSE`](../LICENSE), with its copyright notice, stays with every copy you share. Changing `developer` changes who
`/bot info` names, and leaves that notice where it is.
