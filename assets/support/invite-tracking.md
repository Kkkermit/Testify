---
id: invite-tracking
title: Invite tracking
topic: community
keywords: invites, invite tracking, who invited, inviter, invite leaderboard, invite count, invited by, referral, top inviters
questions: How do I see who invited someone? | How do I track invites? | Who has invited the most members? | How many people has my invite brought?
commands: invites
related: dashboard-members
---
Invite tracking records which invite each new member joined with, so you can see whose invites bring people in and how many of them stay.

### Turning it on
Run `/invites settings` and turn it on. You need **Manage Server**, and so does {bot}, because Discord only lists a server's invites to somebody who has it. Pick a channel if you want each join announced; nobody is pinged. On the dashboard it is **Invites** under Stats.

### Seeing it
- `/invites view` shows how many members somebody's invites brought, how many are still here, and whose invite they joined with.
- `/invites top` ranks the members whose invites brought in the most people who stayed.
- A member's page on the dashboard says whose invite they joined with.

### What it cannot tell
Counting starts when you turn it on. When two people join at the same moment, or {bot} has just restarted, the invite may not be told apart, and the join is recorded as unknown rather than guessed.
