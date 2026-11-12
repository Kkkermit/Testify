The dashboard is a website for setting Testify up without typing commands. There's a screen for nearly everything the
bot does, and every change there is the same change the matching command makes.

## Opening it

- **The public bot:** [testify.lol](https://testify.lol/). Press **Sign in with Discord**, then pick a server on
  [your servers page](https://testify.lol/guilds).
- **Your own copy:** wherever you set `DASHBOARD_BASE_URL`. It's off until you turn it on; see
  [Turning it on](#turning-it-on-for-your-own-copy) below.

Signing in only asks Discord who you are and which servers you're in. The dashboard never sees your password.

## Who sees what

- **Manage Server** in a server opens all of its screens.
- **Somebody without it** can be given single screens by the server's owner or an administrator, on the
  **Dashboard access** screen: [give somebody part of the dashboard](https://testify.lol/docs/guides/dashboard-access).
- **Every action still asks what its command asks.** Banning from the web needs Ban Members, just as `/ban` does, and
  the screen says which permission is missing before you try.
- **Losing a permission in Discord takes effect on your next click,** not at your next sign-in.

## Inside a server

The sidebar groups a server's screens by what they're for. The addresses are `/guilds/<server id>/<screen>`.

| Section           | Screens                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| _Top_             | Overview, Inbox, This week, Channels, Members, Roles, Settings, Back up and copy                               |
| **Community**     | Welcome and goodbye, Birthdays, Levelling, Role menus, Idea board, Starboard, Join to create                   |
| **Messages**      | Announcements, Scheduled messages, Sticky messages, Auto-responders                                            |
| **Moderation**    | AutoMod, Raid protection, Warnings, Cases, Bans, Appeals, Mod mail, Channel tools, Tickets, Audit log, Changes |
| **Stats**         | Insights, Invites, Member count, Bot statistics                                                                |
| **Economy**       | Economy settings, Treasure, Lottery, Casino                                                                    |
| **Entertainment** | Music, Giveaways                                                                                               |

A few screens worth knowing first:

- **Overview** says what the bot is doing in the server, which permissions it's missing, and has a setup checklist.
- **Inbox** lists what needs a person: unclaimed tickets, ideas waiting, and channels a feature can't post in.
- **Changes** lists two weeks of changes, from the dashboard and from Discord's audit log. A settings change can be
  put back from there.
- **Back up and copy** downloads a server's settings, or copies another server's setup onto this one.

[Finding your way around the dashboard](https://testify.lol/docs/guides/dashboard-tour) walks through it.

## Pages that aren't about one server

| Page                                               | What it's for                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| [Your servers](https://testify.lol/guilds)         | The servers you can configure, and the ones you can add the bot to          |
| [Compare](https://testify.lol/guilds/compare)      | Two to four of your servers side by side, feature by feature                |
| [Commands](https://testify.lol/commands)           | Every command, searchable                                                   |
| [Help](https://testify.lol/help)                   | First steps, and questions answered from the help articles                  |
| [Notifications](https://testify.lol/notifications) | What the bot's owners want everybody to know                                |
| [Your account](https://testify.lol/account)        | Your profile, reminders, sign-ins, what you've changed, and Delete my data  |
| [Appeals](https://testify.lol/appeals)             | Appealing a ban from a server that takes appeals                            |
| [Status](https://testify.lol/status)               | Whether the bot is up, with 30 days of history. Public                      |
| [Appearance](https://testify.lol/appearance)       | Theme, accent colour, motion and language. Public, and kept in your browser |

## Handy to know

- **Quick search:** press Ctrl+K, or ⌘K on a Mac, to jump to any screen, server, channel or command.
- **Switching server** keeps you on the same screen: open the server's name at the top of the sidebar.
- **Deleting something waits a few seconds** with an **Undo** button before anything is sent.
- **Send me a test** beside a message preview sends that message to your own DMs, exactly as members would get it.
- **It works on a phone.** The sidebar becomes a menu.
- **A change that didn't save** says why beside the control that caused it:
  [a change on the dashboard did not save](https://testify.lol/docs/guides/dashboard-changes-not-saving).

## Turning it on for your own copy

The dashboard is off by default, so a bot-only install needs none of this. It takes four settings, and
`npm run setup` asks for all of them:

| Variable                   | What it is                                                              |
| -------------------------- | ----------------------------------------------------------------------- |
| `DASHBOARD_ENABLED`        | `true` to serve it                                                      |
| `DISCORD_CLIENT_SECRET`    | From your application's **OAuth2** page in the Discord Developer Portal |
| `DASHBOARD_BASE_URL`       | The address people open, such as `https://dashboard.example.com`        |
| `DASHBOARD_SESSION_SECRET` | `npm run secret -- --write` writes one into your `.env`                 |

Add your base URL with `/api/auth/callback` on the end as a redirect on that same OAuth2 page. Before you put it on
the internet, read
[If you put it on the internet](https://github.com/Kkkermit/Testify/blob/main/README.md#if-you-put-it-on-the-internet):
the defaults assume it stays on your own machine. [Self-hosting](Self-hosting) covers the rest of the setup.

## Working on the dashboard's code

[`docs/dashboard/guide.md`](https://github.com/Kkkermit/Testify/blob/main/docs/dashboard/guide.md) is the practical
guide: the layout, the components, and the edits a new screen takes. See [Contributing](Contributing) too.
