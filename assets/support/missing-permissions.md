---
id: missing-permissions
title: “You need” or “I need” these permissions
topic: troubleshooting
keywords: you need these permissions, i need these permissions, permission error, missing permission, not allowed, forbidden, missingpermission
questions: Why does it say I need permissions? | Why does the bot say it needs permissions?
related: role-order, permissions, bot-permissions
---
A command checks permissions before it runs, and the reply says whose are missing.

### “You need these permissions”
You do not have what the command needs, such as **Ban Members** for `/ban`. Ask an admin for a role that has it.

### “I need these permissions”
The bot is missing what it needs. Give its role that permission in **Server Settings → Roles**, and check the channel's own overrides, which can take it away in one channel.

> **Tip:** For roles, the bot's role also has to sit above the role it is changing.
