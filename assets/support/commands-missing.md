---
id: commands-missing
title: Slash commands are not showing up
keywords: slash commands missing, not showing, not appearing, cannot find command, command not found, no commands, commands gone, invalid command, type slash, nothing appears
featured: true
---
Discord caches the list of slash commands in your app, so a new or changed command can take a reload to appear.

1. Reload Discord: press **Ctrl+R** on Windows or Linux, **Cmd+R** on macOS, or restart the app on a phone.
2. Check the bot is still in the server and was added with the **applications.commands** permission. Adding it again from the [servers page](/guilds) fixes a missing permission.
3. Check the command has not been switched off for this server under **Commands** in the dashboard.
4. Some commands only appear for people with the right permission, such as Manage Server for setup commands.

Prefix commands never need a reload, so `{prefix}help` is a quick way to check the bot is answering.
