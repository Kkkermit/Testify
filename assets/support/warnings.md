---
id: warnings
title: Warnings
topic: moderation
keywords: warn, warning, warnings, strike, infraction, warn list, clear warnings, delete warning, edit warning, punishment, punishments, escalate, auto mute, auto kick, auto ban
questions: How do I warn someone? | How do I see someone's warnings? | How do I remove a warning? | Can a warning mute, kick or ban someone automatically? | How do I set punishments for warnings?
commands: warn
related: moderation, dashboard-members, link-filter
---
Warnings are a record of what a member did, kept per server. They need **Moderate Members**.

### Commands
- `/warn create` warns a member, with a reason.
- `/warn list` shows a member's warnings.
- `/warn info` shows one warning in full, with its edit history.
- `/warn edit` changes a warning's reason.
- `/warn remove` deletes one warning, and `/warn clear` deletes them all.
- `/warn punishments` sets what each warning does. It needs **Manage Server**.

When a command needs a particular warning, start typing and pick it from the list, so there is no ID to copy.

### Punishments
Each warning number can do something on top of being recorded: nothing more, a timeout from five minutes to a week, a kick, or a ban. For example, the first warning could be only a warning, the second a ten-minute timeout, the third a kick and the fourth a ban. Past the last step, the last one repeats.

The member is told the reason and what happens next before it happens. If the bot cannot carry out a step, because its role is not above the member's or it lacks the permission, the warning is still recorded and whoever issued it is told why.

### On the dashboard
**Warnings**, under Moderation, lists every warning in the server with its reason, who gave it and when, and each one can be edited or removed. You can warn somebody by finding them by name or by pasting their Discord ID, and set the punishments there too. A member's page, reached through **Leaderboards**, has the same controls for that one person.

> **Tip:** Link filtering records every link it removes as a warning, so its warnings count towards the punishments too.
