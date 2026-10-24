---
id: reminders
title: Setting a reminder
topic: community
keywords: remind, reminder, reminders, remind me, timer, alarm, later, cancel reminder, dm reminder, ping me
questions: How do I set a reminder? | Can the bot remind me to do something later? | How do I cancel a reminder? | Can a reminder come by DM?
commands: remind
related: how-commands-work
---
`/remind me` takes when and what, such as `/remind me in:2h about:check the oven`. Only you see the answer, and when the time comes {bot} pings you in the channel you set it in.

- **By DM instead:** press **DM me instead** on the answer. A reminder set in a DM always arrives by DM.
- **Cancel one:** press **Cancel it** on the answer, or run `/remind list`, which shows every reminder you have with a Cancel beside each.
- **With the prefix:** `{prefix}remindme 2h check the oven` does the same.

A reminder can be from {fact:reminder.min} to {fact:reminder.max} away, and you can have {fact:reminder.maxActive} at once. They are kept in the database, so a restart does not lose one.

> **Tip:** If you have left the server, or {bot} can no longer post in that channel, the reminder comes by DM. If your DMs are closed too, it cannot reach you and is dropped.
