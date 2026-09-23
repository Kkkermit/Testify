---
id: role-order
title: The bot cannot give or remove a role
topic: troubleshooting
keywords: role hierarchy, role order, cannot give role, missing permissions, manage roles, higher role, role position, reward role not given, auto role not working, missingpermission
questions: Why can't the bot give a role? | The bot says it is missing permissions for a role | Why are level rewards not given?
commands: role
related: missing-permissions, level-rewards, auto-role
---
Discord only lets a bot manage roles that sit **below its own highest role**. This affects level rewards, roles on join, verification and `/role`.

### Fixing it
1. Open **Server Settings → Roles** in Discord.
2. Drag the bot's role above every role it should hand out.
3. Make sure the bot's role has **Manage Roles**.

The dashboard's levelling screen warns you when a role you pick sits above the bot's.

> **Tip:** No bot can give a role that an integration manages, such as a server booster role.
