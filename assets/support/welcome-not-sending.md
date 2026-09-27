---
id: welcome-not-sending
title: Welcome messages are not being sent
topic: troubleshooting
keywords: welcome not working, no welcome message, greeting not sent, welcome card missing
questions: Why is the welcome message not sending?
commands: welcome
related: welcome, welcome-styles
---
1. **Is the greeting switched on,** with a channel chosen? Check **Welcome** on the dashboard.
2. **Can the bot post there?** It needs **Send Messages**, plus **Attach Files** for the image card.
3. **Test it:** `/welcome test` sends you the greeting a new member would get.

> **Tip:** A channel's own permission overrides can block the bot even when its role allows posting.
