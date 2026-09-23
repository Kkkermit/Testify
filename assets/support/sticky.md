---
id: sticky
title: Sticky messages
topic: setup
keywords: sticky, sticky message, pinned message, keep message at bottom, pin to bottom, repost
questions: How do I keep a message at the bottom of a channel? | How do sticky messages work?
commands: sticky-message
related: announcements
---
A sticky message stays at the bottom of a channel: after a set number of new messages, {bot} posts it again underneath.

### In Discord
- `/sticky-message setup` takes the channel, the message and **cap**: how many messages pass before it reposts, from {fact:sticky.minCap} to {fact:sticky.maxCap}.
- `/sticky-message check` lists the active ones.
- `/sticky-message disable` removes one.

### On the dashboard
Open your server, then **Sticky** under Channels.

There can be one per channel, and up to {fact:sticky.maxPerServer} in a server.
