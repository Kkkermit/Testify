---
id: timeouts
title: Timing members out
topic: moderation
keywords: mute, timeout, time out, unmute, silence, shut up, temporary mute, how long, length, minutes, hours, days
questions: How do I mute someone? | How do I time someone out? | How do I unmute someone?
commands: mute, unmute
related: moderation, role-order
---
A timeout stops a member sending messages, reacting or joining voice until it ends. It needs **Moderate Members**.

- `/mute` times a member out. Give a length such as `10m`, `2h` or `3d`, and optionally a reason.
- `/unmute` lifts it early.

`{prefix}timeout` works as a prefix alias for `/mute`.

> **Tip:** Discord will not let anyone time out a member whose highest role is above their own, or above the bot's.
