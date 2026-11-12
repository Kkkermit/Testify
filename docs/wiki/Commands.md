## Every command, two ways

Every Testify command works as a slash command and as a prefix command:

```text
/ban user:@someone reason:spamming
t?ban @someone spamming
```

- **The default prefix is `t?`,** and it matches in any case, so a phone's `T?help` works too. A server can change it
  with `/prefix set`, or switch prefix commands off with `/prefix disable`.
- **Many commands have short aliases** for the prefix, such as `t?bal`, `t?lb` and `t?np`.
- **Some commands answer only you.** As a slash command the reply is private. A prefix command can't be private, so
  its reply and your message delete themselves after 20 seconds.

## Where to find them

- **In Discord:** `/help` lists every command by category, and `/help` with a command's name explains it.
- **The full list:** [testify.lol/docs/commands](https://testify.lol/docs/commands), or
  [`docs/commands.md`](https://github.com/Kkkermit/Testify/blob/main/docs/commands.md) in the repository. It's
  generated from the code, so it always matches the bot.
- **On the dashboard:** [Commands](https://testify.lol/commands), searchable, and each server's **Commands** screen,
  where single commands can be switched off.

## What's there

| Category      | For example                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| 💰 Economy    | `/balance`, `/work`, `/daily`, `/rob`, `/heist`, `/shop`, `/pet`, `/lottery` |
| 🛡️ Moderation | `/ban`, `/kick`, `/mute`, `/warn`, `/case`, `/softban`, `/lock`, `/clear`    |
| 📚 Info       | `/user-info`, `/server-info`, `/profile`, `/help`, `/ask`, `/delete-my-data` |
| ⚙️ Settings   | `/automod`, `/raid-protection`, `/welcome`, `/auto-responder`, `/schedule`   |
| 👥 Community  | `/birthday`, `/poll`, `/remind`, `/idea`, `/starboard`, `/temp-voice`        |
| 📈 Levelling  | `/rank`, `/levelling`                                                        |
| 🎵 Music      | `/play`, `/music`                                                            |
| 🎰 Casino     | `/casino`: roulette, blackjack, slots, hi-lo, coinflip and dice              |
| 🎮 Fun, games | `/fun`, `/game`                                                              |
| 🎁 Giveaways  | `/giveaway`                                                                  |
| 🎫 Tickets    | `/ticket`                                                                    |
| 💬 Feedback   | `/suggest`, `/bug-report`                                                    |

Owner commands, such as `/blacklist`, only answer the bot's owners. Everybody else is refused.

## Right-click actions

Right-click a member or a message, then open **Apps**:

- **On a member:** **Warn** and **Time out**, which do exactly what `/warn create` and `/mute` do.
- **On a message:** **Report message**, which sends it to the server's mod mail channel, and **Add to starboard**.

## Switching commands off

- **In one server:** the dashboard's **Commands** screen. Discord still lists the command, but it refuses to run.
- **Everywhere, for the bot's owners:** the owner console. A command switched off this way says it's under maintenance.
- **A whole feature, on your own copy:** `DISABLED_FEATURES`, which takes it out of Discord's menu entirely. See
  [Self-hosting](Self-hosting#switching-features-off).

`/help` and `/delete-my-data` can never be switched off.

## Adding your own command

One file in `src/commands/<category>/` makes a command that works both ways, and `/help` lists it straight away.
[Adding a command](https://testify.lol/docs/adding-a-command) shows the whole file.
