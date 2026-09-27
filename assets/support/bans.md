---
id: bans
title: Bans, unbans and softbans
topic: moderation
keywords: ban, unban, softban, temporary ban, tempban, kick, remove member, ban length, how long, hours, days, week
questions: How do I ban someone? | How do I unban someone? | How do I ban someone temporarily? | What is a softban?
commands: kick, ban, unban, softban
related: moderation, dashboard-members
---
All of these need **Ban Members**, except kicking, which needs **Kick Members**.

- `/kick` removes a member, who can rejoin with an invite.
- `/ban` keeps someone out for good. It can also delete up to 7 days of their messages.
- `/unban` lets them back in. It takes their user ID.

### Softbans
A softban is a ban that lifts itself. `/softban add` takes a length such as `12h` or `7d`, and the ban ends on its own when the time is up.
- `/softban list` shows the active ones.
- `/softban remove` lifts one early. So does **Lift it now** on the member's page on the dashboard.
