---
id: commands-missing
title: Slash commands are not showing up
topic: troubleshooting
keywords: slash commands missing, not showing, not appearing, cannot find command, command not found, no commands, commands gone, type slash, nothing appears
questions: Why are slash commands not showing? | The commands don't appear when I type / | Where did the commands go?
related: bot-not-responding, switch-commands-off
featured: true
---
Discord remembers the list of slash commands in your app, so a new or changed command can take a reload to appear.

### Try these in order
1. **Reload Discord**: press **Ctrl+R** on Windows or Linux, **Cmd+R** on macOS, or close and reopen the app on a phone.
2. **Check the bot is still in the server** and was added with its command permission. Adding it again from the [servers page](/guilds) fixes a missing one.
3. **Check the command is switched on** under **Commands** on the dashboard.
4. **Check your permissions.** Setup commands only appear for people with **Manage Server**.

> **Tip:** Prefix commands never need a reload, so `{prefix}help` is a quick way to check the bot is answering.
