---
id: temp-voice
title: Join-to-create voice channels
topic: community
keywords: join to create, temp voice, temporary voice channel, temporary channels, own voice channel, private voice channel, voice lobby, auto voice channels, voice rooms
questions: How do I give members their own voice channel? | How do I set up join to create? | Why is no voice channel being made when somebody joins the lobby? | How do I make voice channels that delete themselves?
commands: temp-voice
related: voice-stats
---
Join to create gives everybody who joins a lobby voice channel a channel of their own. {bot} moves them into it and deletes it once the last person leaves.

### Setting it up
Run `/temp-voice`, pick a voice channel to be the lobby or press the button that makes one, and turn it on. You need **Manage Server**, and making a lobby from the dashboard also needs **Manage Channels**. On the dashboard it is **Join to create** under Channels.
- **Category:** new channels go in the lobby's own category unless you choose another, and take that category's permissions.
- **Name:** `{user}` becomes the member's name.
- **People per channel:** 0 for no limit, up to {fact:tempVoice.maxPeople}.

### How it behaves
- Somebody who already has a channel is moved back into it rather than given a second one.
- A member gets at most one new channel every {fact:tempVoice.makePause}, so hopping in and out of the lobby does not fill the server.
- When {bot} has **Manage Roles**, each channel's owner can rename it or change its limit.
- {bot} only ever deletes channels it made itself.

> **Tip:** {bot} needs **Manage Channels** and **Move Members**. Without them nothing is made, and the panel and the dashboard both say so.
