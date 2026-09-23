---
id: verification
title: Verifying new members
topic: setup
keywords: verify, verification, captcha, gate, new members, verified role, unverified, raid, bots, code, explainer
questions: How do I set up verification? | How do I stop bots joining? | How does the verify button work?
commands: verify
related: role-order, auto-role
---
Verification makes new members prove they are a person before they get a role.

### How it works for a member
1. They press **Verify** on the panel.
2. A box shows a short code, and they type it back.
3. They get the verified role straight away.

### Setting it up
- **In Discord:** `/verify setup` opens the panel, `/verify edit` changes it and `/verify disable` turns it off.
- **On the dashboard:** open your server's **Settings** and find **Verification**.

Choose the panel channel and the verified role. For it to keep people out, stop @everyone seeing your other channels, and let the verified role see them.

> **Tip:** The bot needs **Manage Roles**, and its role must sit above the verified role.
