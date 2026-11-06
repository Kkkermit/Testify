---
id: right-click-actions
title: Right-click actions
topic: moderation
keywords: right click, right-click, apps menu, context menu, long press, report message, report a message, warn from menu, time out from menu, add to starboard, star a message
questions: How do I report a message? | Can I warn somebody by right-clicking them? | How do I put a message on the starboard myself? | Where is the Apps menu?
commands: warn, mute, modmail, starboard
related: modmail, starboard, warnings
---
Some things {bot} does are on the right-click menu, so you can do them without typing a command.

### Where to find them
Right-click a member or a message, or press and hold it on a phone, and open **Apps**. They only appear in a server, and only to people who could use them.

### On a member
- **Warn** opens a form for the reason, then warns them exactly as `/warn create` does: the warning is numbered, counts towards the server's punishments and is sent to them. It needs Moderate Members.
- **Time out** opens a form for how long, like `10m`, `2h` or `3d`, and an optional reason, then times them out as `/mute` does. It needs Moderate Members, for you and for {bot}.

### On a message
- **Report message** sends the message, who wrote it and what you say is wrong with it to the server's mod mail channel, where the staff can jump to it. Anybody can report, a few times an hour, and only once for each message. It works once the server has set up mod mail with `/modmail settings`.
- **Add to starboard** puts the message on the starboard however many stars it has. It needs Manage Messages, and the starboard has to be on.

> The answers are only shown to you. Switching a command off in a server switches its action off too: `/warn` for Warn, `/mute` for Time out, `/modmail` for Report message and `/starboard` for Add to starboard.
