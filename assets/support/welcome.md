---
id: welcome
title: Welcoming new members
topic: setup
keywords: welcome, greet, greeting, join message, new member, welcome message, welcome channel, joins
questions: How do I set up a welcome message? | How do I greet new members? | How do I choose the welcome channel?
commands: welcome
related: welcome-styles, auto-role, welcome-not-sending
---
{bot} can greet everybody who joins, in a channel you choose.

### In Discord
1. Run `/welcome setup` to open the welcome panel.
2. Pick the channel, edit the message and choose a style.
3. Run `/welcome test` to be sent the greeting a new member would get.

### On the dashboard
Open your server, then **Welcome** under Community. The preview updates as you type.

### Placeholders
- `{user}` mentions the new member.
- `{username}` is their name without a mention.
- `{server}` is the server's name.
- `{count}` is the new member count.

The message can be up to {fact:welcome.maxMessage} characters.
