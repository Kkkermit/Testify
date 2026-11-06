---
id: economy-admin
title: Managing the economy as an admin
topic: community
keywords: give money, give xp, reset economy, reset levels, wipe, admin economy, economy info server, add money, pay rate, xp rate, starting money, turn off robbing, double xp
questions: How do I give someone money? | How do I reset the economy? | How do I reset everyone's levels? | How do I change how much the economy pays? | How do I turn off robbing? | How do I make XP faster?
commands: give, reset, economy-info, economy
related: dashboard-members
---
These need **Administrator**.

- `/give currency` adds money to a member's wallet or bank, and `/give xp` adds XP.
- `/reset user` wipes one member's economy account.
- `/reset server` wipes every economy account in the server.
- `/reset levels` wipes every level in the server.

`/economy-info server` shows the economy's totals for the server.

### Pay and rates
`/economy settings` needs **Manage Server** and changes how this server's economy and XP differ from {bot}'s own numbers:
- **Pay** scales `/daily`, `/work` and `/beg`, from a quarter to three times the usual.
- **New accounts start with** sets the starting wallet, for accounts opened from then on.
- **Robbing** can be turned off, and `/rob` is then refused.
- **XP** scales what each message earns before any boost role, and **XP cooldown** sets the wait between messages that earn it.

On the dashboard the first three are **Pay and rates** under Economy, and the XP ones are on the Levelling page.

> **Tip:** On the dashboard, a member's page can add or take money and XP too. It asks **Administrator**, just as `/give` does.
