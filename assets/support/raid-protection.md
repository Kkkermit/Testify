---
id: raid-protection
title: Raid protection
topic: moderation
keywords: raid, raids, anti raid, antiraid, join spike, mass join, new accounts, alt accounts, account age, bots joining
questions: How do I stop raids? | Can the bot stop brand new accounts? | How do I get told when lots of people join? | Does raid protection kick people?
commands: raid-protection, unmute
related: moderation, timeouts, verification
---
Raid protection holds back brand new accounts and tells your staff when lots of people join at once. It never kicks or bans anybody.

### Holding back new accounts
Set a minimum account age, from 1 to {fact:raid.maxAccountAge}. An account newer than that is timed out until it is old enough, and {bot} tells them why. {fact:raid.maxAccountAge} is the most because that is Discord's longest timeout. Lift a hold sooner with `/unmute`. {bot} needs the Moderate Members permission for this.

### Spike alerts
Pick a channel, and {bot} posts there when a number of members join within a few minutes, naming the newest and how new their accounts are. It can ping one staff role, which is the only thing an alert ever pings. A spike that goes on is reported again every {fact:raid.alertEvery}, not once a join. Each held account is reported in the same channel too.

### Setting it up
Run `/raid-protection`, which needs Manage Server and Moderate Members, or open your server on the dashboard and pick **Raid protection** under Moderation.

> If a raid is happening, pause invites or raise the verification level under **Server Settings → Safety Setup** in Discord.
