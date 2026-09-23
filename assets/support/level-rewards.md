---
id: level-rewards
title: Level rewards, XP boosts and ignored channels
topic: setup
keywords: level rewards, role rewards, level roles, reward roles, xp boost, multiplier, double xp, ignored channels, no xp channels, stack roles, explainer
questions: How do I give a role at a level? | How do level rewards work? | How do I give a role bonus XP? | How do I stop a channel earning XP?
commands: levelling
related: levelling, role-order
---
All three live on the levelling panel, reached with `/levelling setup` or **Levelling** on the dashboard.

### Rewards
Roles handed out when a member reaches a level, up to {fact:levelling.maxRewards} of them, at levels up to {fact:levelling.maxRewardLevel}. Choose whether members keep every reward they pass, or only the highest.

### Boosts
Roles that earn extra XP, up to {fact:levelling.maxBoosts}, each with a multiplier up to {fact:levelling.maxMultiplier}×. Somebody holding several gets the highest multiplier, not all of them multiplied together.

### Ignored
Up to {fact:levelling.maxIgnoredChannels} channels and {fact:levelling.maxIgnoredRoles} roles that earn no XP at all.

> **Tip:** The bot's role must sit above every reward role, or Discord refuses to hand it out. The dashboard warns you when one does not.
