## Asking for help

1. **Ask the bot.** `/ask` in Discord, or the [Help page](https://testify.lol/help) on the dashboard, answers from the
   bot's own help articles. Every article is also on the website, under
   [Guides](https://testify.lol/docs/guides).
2. **Check the status page.** [testify.lol/status](https://testify.lol/status) says whether the public bot is up, and
   shows 30 days of history.
3. **Ask a person** in the [support server](https://discord.gg/xcMVwAVjSD).
4. **Report a bug or ask for a feature** with `/bug-report` or `/suggest` in Discord, or
   [open an issue](https://github.com/Kkkermit/Testify/issues/new/choose) on GitHub.
5. **Found a security problem?** Report it privately, as
   [`docs/security.md`](https://github.com/Kkkermit/Testify/blob/main/docs/security.md) describes, never in a public
   issue.

When something goes wrong unexpectedly, the bot's reply includes a short reference code. Put it in your report, so
the failure can be found in the logs.

## Using the bot

| Problem                               | Where to look                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Slash commands don't show up          | Reload Discord with Ctrl+R (⌘R on a Mac): [commands missing](https://testify.lol/docs/guides/commands-missing) |
| Prefix commands do nothing            | [Prefix commands are not working](https://testify.lol/docs/guides/prefix-not-working)                          |
| The bot doesn't answer at all         | [The bot is not answering](https://testify.lol/docs/guides/bot-not-responding)                                 |
| "You need" or "I need" a permission   | [Missing permissions](https://testify.lol/docs/guides/missing-permissions)                                     |
| The bot can't give or remove a role   | Move its role higher: [role order](https://testify.lol/docs/guides/role-order)                                 |
| Music won't play                      | [Music is not playing](https://testify.lol/docs/guides/music-not-playing)                                      |
| A change on the dashboard didn't save | [A change did not save](https://testify.lol/docs/guides/dashboard-changes-not-saving)                          |

## Running your own copy

| Symptom                                  | Fix                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `Your .env file needs attention`         | The message lists exactly which values are wrong. Optional ones can be left blank    |
| `Used disallowed intents`                | Turn on **Message Content** and **Server Members** in the Developer Portal           |
| `MongoServerError: bad auth`             | Wrong database password, or `<password>` was left in the connection string           |
| `querySrv ECONNREFUSED`                  | Your DNS can't resolve the Atlas address. Try another network, or the non-SRV string |
| `EBADENGINE` during install              | Your Node is older than 24.11. Run `nvm use`                                         |
| Commands that no longer exist still show | Run `npm run commands:clear`, then start the bot again                               |
| Cards render with no text on them        | You're in a container without fonts: use the repository's `Dockerfile`               |
| `Sign in to confirm you're not a bot`    | YouTube is refusing your host. Update yt-dlp, or set `/play` to SoundCloud only      |

More in the README's [FAQ](https://github.com/Kkkermit/Testify/blob/main/README.md#-faq) and
[troubleshooting table](https://github.com/Kkkermit/Testify/blob/main/README.md#-troubleshooting), and in
[`docs/hosting.md`](https://github.com/Kkkermit/Testify/blob/main/docs/hosting.md).

**Leaked a token?** Reset it straight away under **Developer Portal → your application → Bot → Reset Token**, then
update your `.env`. Deleting a commit isn't enough: treat anything pushed to GitHub as public for good.
