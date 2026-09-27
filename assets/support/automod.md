---
id: automod
title: AutoMod filters
topic: setup
keywords: automod, auto mod, filter, bad words, swear, profanity, spam, mention spam, keyword, block words, flagged words
questions: How do I block bad words? | How do I stop spam? | How do I set up AutoMod?
commands: automod
related: link-filter, moderation
---
AutoMod rules are Discord's own message filters. {bot} sets them up, and Discord enforces them.

### The rules you can create
- `/automod flagged-words` blocks profanity, sexual content and slurs.
- `/automod spam` blocks spam messages.
- `/automod mention-spam` blocks messages that mention too many people.
- `/automod keyword` blocks a word or phrase of your own.

`/automod list` shows the rules, and `/automod delete` removes one. On the dashboard, open your server, then **AutoMod** under Moderation.

> **Tip:** Because Discord runs these rules, they keep working even while the bot is offline. They also appear under **Server Settings → AutoMod** in Discord.
