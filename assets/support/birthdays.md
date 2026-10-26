---
id: birthdays
title: Birthdays
topic: community
keywords: birthday, birthdays, bday, cake, happy birthday, celebrate, date of birth, age
questions: How do I set my birthday? | Can the bot wish people happy birthday? | How do I turn on birthday posts? | Does the bot know how old I am?
commands: birthday
related: welcome, privacy
---
Members share their own birthday with a server, and {bot} posts a message there on the day.

### Sharing yours
Run `/birthday set` with the day and the month. Only those two are kept, never the year, so nobody learns your age. It is shared with that one server, so set it again in each server you want to tell. `/birthday remove` takes it back, and leaving the server forgets it.

### Turning posts on
Run `/birthday settings` to open the panel, which needs Manage Server. Pick the channel, edit the message and turn it on. The message can use `{user}`, which mentions them, `{username}` and `{server}`, and it can be up to {fact:birthday.maxMessage} characters. Only the member is pinged.

### On the dashboard
Open your server, then **Birthdays** under Community. It also lists whose birthday comes next.

> Birthdays are posted once a day, by the date in UTC. A birthday on 29 February is posted on the 28th in other years.
