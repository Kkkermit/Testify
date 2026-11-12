Everything here applies to the public bot and to your own copy alike. The help articles linked below are the same
ones `/ask` answers with in Discord.

## 1. Add the bot

You need **Manage Server** in a server to add a bot to it. Either:

- use the [invite link](https://discord.com/oauth2/authorize?client_id=1211784897627168778&permissions=1374821936374&scope=bot+applications.commands); or
- sign in to the [dashboard](https://testify.lol/guilds) and press **Add** beside the server.

The invite asks for a fixed list of permissions, not Administrator, so the bot can only do what its features need.
[The permissions it asks for](https://testify.lol/docs/guides/bot-permissions) explains each one.

**Then move its role up.** In Discord, open **Server Settings → Roles** and drag the bot's role above any role it
should hand out or moderate. A bot can't manage a role above its own:
[the bot can't give or remove a role](https://testify.lol/docs/guides/role-order).

## 2. Try a command

- **`/help`** lists every command, by category.
- **`/ask`** answers questions about the bot from its help articles, such as "how do I set up levelling?".
- **Prefix commands** work too. The default prefix is `t?`, so `t?help` does the same as `/help`, in any case.
  Change it with `/prefix set` or on the dashboard's **Settings** screen:
  [changing the prefix](https://testify.lol/docs/guides/change-prefix).

[Slash commands and prefix commands](https://testify.lol/docs/guides/how-commands-work) explains the difference, and
[Commands](Commands) is where to find them all.

## 3. Set up your server

A good order, from [the setup checklist](https://testify.lol/docs/guides/first-steps):

1. **Pick a prefix**, or keep `t?`.
2. **Greet people** with a welcome message and an image card.
3. **Protect the server** with verification, AutoMod filters, link filtering, raid protection and an audit log.
4. **Reward activity** with levelling and level rewards.
5. **Give members a way to reach staff** with tickets or mod mail.
6. **Tell your members** about `/help` and `/ask`.

Every feature can be set up in Discord or on the [dashboard](The-dashboard), and both change the same settings. On
the dashboard, the server overview's setup checklist turns on levelling, a welcome message and an audit log in one
press each, and says first exactly where each will post.

## Languages

Discord's command menus and the replies every command shares come in eight languages: English, German, Spanish,
French, Italian, Russian, Dutch and Japanese. The bot follows each person's own Discord language. The dashboard
comes in the same eight. See [the bot in your language](https://testify.lol/docs/guides/languages).

## Your data

- **What's stored, and for how long:** the [privacy notice](https://testify.lol/privacy) and
  [what Testify stores about you](https://testify.lol/docs/guides/privacy).
- **Delete it:** `/delete-my-data` in Discord, or **Your data** on your dashboard
  [account page](https://testify.lol/account). It deletes what the bot keeps about you in every server, straight
  away. Moderation records about you, such as warnings, are kept, because they protect the servers you're in.
- **Terms:** [testify.lol/terms](https://testify.lol/terms).

## Removing the bot

Anybody with **Kick Members** can remove it: right-click it in the member list and choose **Kick**. Most of its
settings for that server are forgotten. Member records, such as levels, warnings and cases, are kept, and so is the
setup for levelling, tickets, verification, the lottery and giveaways, so adding the bot back finds them where they
were. To lose only part of it, switch that feature or command off instead:
[removing the bot](https://testify.lol/docs/guides/remove-the-bot).
