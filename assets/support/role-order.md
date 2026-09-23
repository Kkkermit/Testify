---
id: role-order
title: The bot cannot give or remove a role
keywords: role hierarchy, role order, cannot give role, missing permissions, manage roles, higher role, role position, reward role not given, auto role not working
---
Discord only lets a bot manage roles that sit **below its own highest role**. This affects level rewards, roles on join, verification and `/role`.

1. Open **Server Settings → Roles** in Discord.
2. Drag the bot’s role above every role it should hand out.
3. Check the bot’s role has the **Manage Roles** permission.

The levelling screen on the dashboard warns you when a role you pick sits above the bot’s own.
