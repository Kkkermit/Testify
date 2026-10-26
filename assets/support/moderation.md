---
id: moderation
title: Moderating members
topic: moderation
keywords: moderation, moderate, punish, discipline, mod commands, moderator tools, rule breakers
questions: What moderation commands are there? | How do I moderate my server?
commands: warn, mute, kick, ban, softban, case, clear, lock, slowmode
related: warnings, timeouts, bans, moderation-cases, raid-protection, audit-log
---
{bot}'s moderation commands each need the matching Discord permission, and the bot needs it too.

### Dealing with a member
- **Warnings** keep a record: `/warn`.
- **Timeouts** stop someone talking for a while: `/mute` and `/unmute`.
- **Kicks** remove someone who can rejoin: `/kick`.
- **Bans** keep someone out: `/ban`, `/unban`, and `/softban` for a ban that lifts itself.

Each of these is a numbered case you can look up later with `/case`, and `/raid-protection` holds back brand new accounts before they can cause trouble.

### Keeping channels tidy
- `/clear` deletes recent messages in bulk.
- `/lock` and `/unlock` close and reopen a channel.
- `/slowmode` limits how often people can post.

### On the dashboard
Open your server, then **Leaderboards**, then a member. Their warnings and any softban are on their page, and you can manage both there.
