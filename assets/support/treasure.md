---
id: treasure
title: Random money drops
topic: setup
keywords: treasure, drops, money drop, random money, chat rewards, loot, treasure drops, explainer
questions: How do treasure drops work? | How do I give members random money for chatting?
commands: treasure
related: economy
---
Treasure hands out money at random while people chat. Every so often, whoever sends the message it lands on finds it, and it goes straight into their wallet.

### What you control
- How many messages pass between drops: by default a random number from {fact:treasure.minMessages} to {fact:treasure.maxMessages}.
- How much a drop is worth: by default {fact:treasure.minAmount} to {fact:treasure.maxAmount}.
- The shortest time between two drops: by default {fact:treasure.cooldown}.

### Setting it up
- **In Discord:** `/treasure configure` turns it on and sets the ranges, and `/treasure status` shows them.
- **On the dashboard:** open your server, then **Treasure** under Economy.
