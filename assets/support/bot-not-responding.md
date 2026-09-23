---
id: bot-not-responding
title: The bot is not answering
keywords: not responding, not working, no reply, offline, silent, ignoring, does nothing, broken, down, dead, not replying
---
Work through these in order.

1. Open the [status page](/status). It shows whether the bot is online and how quickly it is answering.
2. Check the bot can see the channel and has **Send Messages** and **Embed Links** there. Channel permission overrides are the usual cause.
3. Check the command is switched on for this server under **Commands** in the dashboard.
4. For prefix commands, check you are using this server’s prefix. `/prefix` shows it.
5. If one command fails with a message, that message says what is missing, such as a permission or a role.

If the status page says the bot is offline, only whoever hosts the bot can bring it back.
