---
id: modmail
title: Mod mail
topic: moderation
keywords: mod mail, modmail, contact staff, message staff, message the mods, report privately, private message staff, staff inbox, dm the bot
questions: How do I message the staff privately? | How do I set up mod mail? | How do members contact the mods? | How do I reply to mod mail?
commands: modmail
related: moderation, tickets-for-staff
---
Mod mail lets a member write privately to your staff. Each conversation gets its own thread in a channel only staff can see, and everything is relayed through {bot}'s direct messages.

### Setting it up
Run `/modmail settings`, pick the channel, and turn it on. You need **Manage Server**. Choose a role to ping when a conversation opens, and whether replies are signed with each staff member's name or as the server's staff. On the dashboard it is **Mod mail** under Moderation.

### Writing to staff
Members run `/modmail open` in the server, or send {bot} a direct message and pick the server. Their first message opens the thread, and anything they send {bot} after that goes to the same thread until it closes. A member can have one conversation open at a time.

### Replying
Everything staff write in the thread goes to the member, except a message starting with `//`, which stays in the thread as a note. A ✅ means it was delivered.

### Closing
**Close** on the thread's first post, or `/modmail close` in the thread, ends it and locks the thread. Either needs **Manage Messages**. The member can close it too, from the message {bot} sent them.

> **Tip:** Nothing relayed ever pings anybody, whatever it says.
