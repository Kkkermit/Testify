---
id: bot-permissions
title: The permissions {bot} asks for
topic: getting-started
keywords: bot permissions, invite permissions, why permissions, administrator, what access, manage roles, connect, speak
questions: What permissions does the bot need? | Why does the bot ask for these permissions? | Does the bot need administrator?
related: role-order, missing-permissions, add-the-bot
---
The invite asks for a fixed list rather than Administrator:

{fact:invite.permissions}.

### Why these
- **Manage Roles** for level rewards, roles on join, verification and `/role`.
- **Manage Channels** for tickets, member count channels, `/lock` and `/slowmode`.
- **Manage Messages** for `/clear`, link filtering and sticky messages.
- **Kick Members**, **Ban Members** and **Moderate Members** for the moderation commands.
- **View Audit Log** for the audit log.

### Worth knowing
- Music needs **Connect** and **Speak** in the voice channel. Most servers give those to everyone, but check the channel if the bot cannot join.
- `/impersonate` needs **Manage Webhooks** and `/add` needs **Manage Expressions**, which the invite does not include. Give them to the bot's role if you want those commands.
- A channel's own permission overrides can still take any of these away in that one channel.
