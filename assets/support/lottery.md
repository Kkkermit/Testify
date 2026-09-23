---
id: lottery
title: Running the lottery
topic: setup
keywords: lottery, lottery tickets, pot, draw, jackpot, lotto, entry fee, prize pool, explainer
questions: How does the lottery work? | How do I set up a lottery? | How do I enter the lottery?
commands: lottery
related: economy, giveaways
---
The lottery is a pot that members buy tickets into, drawn on a schedule.

### For members
- `/lottery enter` buys tickets. Each ticket adds its fee to the pot.
- `/lottery info` shows the pot and when the next draw is.

### For managers
- `/lottery setup` sets the ticket price, the channel for results, the draw schedule (hourly, daily or weekly), the number of winners and a starting pot added to every round.
- `/lottery freeze` pauses ticket sales, and `/lottery delete` removes the lottery.
- On the dashboard, open your server, then **Lottery** under Economy.

Setting up, freezing and deleting need **Manage Server**. The pot is shared equally between up to {fact:lottery.maxWinners} winners.
