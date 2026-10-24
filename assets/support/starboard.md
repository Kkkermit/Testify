---
id: starboard
title: Setting up a starboard
topic: community
keywords: starboard, star board, stars, star, highlights, highlights channel, best messages, hall of fame, repost, star reaction
questions: How do I set up a starboard? | How do I repost messages that get lots of stars? | Why did a starred message not reach the starboard? | How many stars does a message need?
commands: starboard
related: ideas
---
A starboard reposts the messages your members like most. React to a message with ⭐, and once it has enough stars {bot} posts a copy in your highlights channel with a link back to the original.

### Setting it up
Run `/starboard`, pick the channel reposts go to, and turn it on. You need **Manage Server**. On the dashboard it is **Starboard** under Community.
- **Stars needed:** from {fact:starboard.minStars} to {fact:starboard.maxStars}. It starts at {fact:starboard.defaultStars}.
- **The author's own star:** off to begin with, so nobody can star their own message onto the board.

### How it behaves
- The count on a repost follows stars being added and taken away, and the repost stays if the count drops.
- Stars on the board itself do not count.
- Deleting the original takes its repost down too. A repost a moderator deletes stays off the board for good.
- A message from an age-restricted channel only reaches a board that is age-restricted too.

> **Tip:** if nothing reaches the board, check that {bot} can send messages in its channel. The panel and the dashboard both warn when it cannot.
