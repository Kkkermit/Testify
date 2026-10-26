---
id: scheduled-messages
title: Scheduling a message
topic: setup
keywords: schedule, scheduled message, scheduled post, timed message, post later, recurring message, daily message, weekly message, repeat message
questions: How do I schedule a message? | Can the bot post a message every day? | How do I post an announcement later? | Why was my scheduled message not posted?
commands: schedule
related: announcements, auto-responders
---
{bot} can post a message later, once or every day or week from then.

### In Discord
`/schedule add` takes the channel, how long from now, how often and the message, such as `/schedule add channel:#news in:2h repeat:once message:Game night starts now!`. `/schedule list` shows them all, soonest first, and changes or deletes any of them. You need **Manage Server**.

### On the dashboard
**Scheduled messages** under Channels takes a date and time in your own time zone.

### How it behaves
- A daily message repeats every 24 hours from its first post, and a weekly one every 7 days. It keeps to that moment, so on your clock it moves by an hour when the clocks change.
- A post more than {fact:schedule.lateBy} late, say because {bot} was offline, is skipped rather than posted late. A repeating one carries on at its next time.
- Nobody it mentions is pinged.
- A server can keep {fact:schedule.maxPerServer}, scheduled up to {fact:schedule.maxAhead} ahead.

> **Tip:** if a post is skipped, check that {bot} can send messages in its channel. The panel and the dashboard both warn when it cannot.
