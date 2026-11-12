**Testify is an all-in-one Discord bot written in TypeScript, with a web dashboard.** You can add the public bot to
your server or run your own copy. It covers moderation, an economy with a casino, levelling, music, tickets,
giveaways, welcome messages and more. Every command works as a slash command (`/ban`) and as a prefix command
(`t?ban`), and nearly everything can also be set up from the dashboard in a browser.

This wiki is a map: where to start and where everything lives. The details stay in the repository and on the
website, where they're checked against the code, so they don't go out of date.

## Where to start

| You want to…                             | Read                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| Add Testify to your server and set it up | [Using Testify](Using-Testify)                       |
| Configure your server from a browser     | [The dashboard](The-dashboard)                       |
| Look up a command                        | [Commands](Commands)                                 |
| Fix something that isn't working         | [Help and troubleshooting](Help-and-troubleshooting) |
| Run your own copy of the bot             | [Self-hosting](Self-hosting)                         |
| Update your copy, or see what changed    | [Releases and updates](Releases-and-updates)         |
| Change the code or send a pull request   | [Contributing](Contributing)                         |
| Understand how parts of it are built     | [How it works](How-it-works)                         |

## Links

| What                         | Where                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 🌐 Website                   | [testify.lol](https://testify.lol/): the landing page, the docs and the source code                                                            |
| 🖥️ Dashboard                 | [testify.lol/guilds](https://testify.lol/guilds): sign in with Discord and pick a server                                                       |
| ➕ Add the bot               | [Invite Testify](https://discord.com/oauth2/authorize?client_id=1211784897627168778&permissions=1374821936374&scope=bot+applications.commands) |
| 📈 Status                    | [testify.lol/status](https://testify.lol/status): whether the bot is up, and 30 days of history                                                |
| 💬 Support server            | [discord.gg/xcMVwAVjSD](https://discord.gg/xcMVwAVjSD)                                                                                         |
| 📖 Docs                      | [testify.lol/docs](https://testify.lol/docs), or the [README](https://github.com/Kkkermit/Testify/blob/main/README.md)                         |
| 📋 Every command             | [testify.lol/docs/commands](https://testify.lol/docs/commands)                                                                                 |
| 🐳 Docker image              | [ghcr.io/kkkermit/testify](https://github.com/Kkkermit/Testify/pkgs/container/testify)                                                         |
| 🏷️ Releases                  | [GitHub Releases](https://github.com/Kkkermit/Testify/releases)                                                                                |
| 🐛 Report a bug              | [Open an issue](https://github.com/Kkkermit/Testify/issues/new/choose)                                                                         |
| 🔒 Report a security problem | Privately, as [`docs/security.md`](https://github.com/Kkkermit/Testify/blob/main/docs/security.md) describes. Never in a public issue          |

## The two ways to have Testify

- **Use the public bot.** Invite it with the link above. Nothing to install: its owners keep it running and up to date,
  and the dashboard at [testify.lol](https://testify.lol/) works with it straight away.
- **Run your own copy.** The code is MIT licensed, so you can host it yourself, change it, rename it and switch off
  what you don't want. It runs on Windows, macOS and Linux, or in Docker on x86 and ARM. Start at
  [Self-hosting](Self-hosting).
