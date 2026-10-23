---
id: role-menus
title: Letting members pick their own roles
topic: setup
keywords: role menu, role menus, self roles, self-assign, reaction roles, pick roles, choose roles, pronoun roles, ping roles, notification roles, region roles, opt in
questions: How do I let members pick their own roles? | How do I make a self-assign role menu? | How do I set up reaction roles? | Can members choose a pronoun role?
commands: role-menu
related: auto-role, role-order
---
A role menu is a message with a **Choose your roles** button. Each member who presses it gets a private list with the roles they already hold ticked, and ticks or unticks the ones they want.

### In Discord
1. Run `/role-menu` and press **New menu**. Give it a title and, if you like, a description.
2. Tick the roles to offer, and pick the channel it goes in.
3. Press **Post**. Every change you make afterwards updates the posted menu.

**Allow only one** turns a menu into a single choice, such as a region or a colour: picking one gives back the other.

### On the dashboard
Open your server, then **Role menus** under Community. Make, change, post and delete each menu from there.

A server can have {fact:roleMenu.maxPerServer} menus of up to {fact:roleMenu.maxRoles} roles each. You need **Manage Roles** to make one.

> **Tip:** Nobody can be handed a role that sits above your own highest role or above the bot's, and a role that moderates or administers — Kick Members, Manage Server, Administrator and the like — can never go on a menu, so a menu cannot be used to take over a server.
