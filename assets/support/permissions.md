---
id: permissions
title: Who can change the settings
topic: getting-started
keywords: permission, permissions, manage server, admin, administrator, who can, allowed, access, staff, moderator, roles needed
questions: Who can change the bot's settings? | What permission do I need? | Can moderators configure the bot?
related: missing-permissions, bot-permissions
---
Changing how {bot} works in a server needs the **Manage Server** permission, in Discord and on the dashboard alike.

- The dashboard checks it again on every request, so somebody who loses the permission loses access on their next click.
- Moderation commands need the matching Discord permission: `/ban` needs **Ban Members**, `/kick` needs **Kick Members** and `/mute` needs **Moderate Members**.
- A few economy admin commands, such as `/give` and `/reset`, need **Administrator**.

When you run a command you cannot use, the reply names the permission you are missing.

> **Tip:** Every command's page, found with `/ask` or on the [command list](/commands), lists the permission it needs.
