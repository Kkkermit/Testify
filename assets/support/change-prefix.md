---
id: change-prefix
title: Changing the prefix
topic: setup
keywords: prefix, change prefix, set prefix, t?, text command prefix, custom prefix, disable prefix, prefix commands off
questions: How do I change the prefix? | What is the prefix? | How do I turn off prefix commands?
commands: prefix
related: how-commands-work, prefix-not-working
---
The prefix goes in front of a text command, such as `{prefix}help`. Each server has its own, and it starts as `{fact:prefix.default}`.

- **In Discord:** run `/prefix`. It needs **Manage Server**.
- **On the dashboard:** open your server's **Settings** and find **Command prefix**.

A prefix can be up to {fact:prefix.maxLength} characters, with no spaces. You can also switch prefix commands off, so only slash commands work in that server.

> **Tip:** Forgot it? Mention the bot on its own in a channel and it replies with the prefix.
