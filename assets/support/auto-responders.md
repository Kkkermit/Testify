---
id: auto-responders
title: Answering words automatically
topic: setup
keywords: auto responder, autoresponder, auto-responder, auto reply, autoreply, automatic reply, trigger, trigger word, keyword reply, canned response
questions: How do I make the bot reply to a word? | How do I set up an auto-responder? | Can the bot answer a question automatically? | Why did the auto-responder not answer?
commands: auto-responder
related: sticky, scheduled-messages
---
An auto-responder answers words you choose with a reply you write. Somebody asking "how do I get roles" can be pointed at your roles channel without anybody typing it again.

### Setting one up
Run `/auto-responder` and press **New auto-responder**, or open **Auto-responders** under Channels on the dashboard. You need **Manage Server**.

### How the words are matched
- **Anywhere, as whole words:** "roles" answers "where are the roles?" but not "roleplay".
- **Only the whole message:** the message has to be the words and nothing else.
- **At the start of a message.**

Case and spacing never matter.

### How it behaves
- It answers members, never bots, so it can never answer its own reply.
- One responder answers a channel at most once every {fact:autoResponder.pause}, however often the words come up.
- A reply never pings anybody, even one that mentions a role or everyone.
- Prefix commands, counting and links the filter deletes are never answered.
- A server can keep {fact:autoResponder.maxPerServer}.

> **Tip:** if it stays quiet, check that {bot} can send messages and read message history in that channel.
