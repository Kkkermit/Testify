---
id: afk
title: Going away with /afk
topic: community
keywords: afk, away, away from keyboard, away note, away message, brb, busy, back later
questions: How do I set an AFK message? | How do I tell people I am away? | How do I turn AFK off? | Why did my AFK note go away?
commands: afk
related: reminders
---
`/afk` sets a note, such as `/afk note:back after lunch`. Anybody who mentions you, or replies to you, in that server is told you are away, with your note and how long ago you went.

- **Coming back:** the note comes off the next time you send a message in that server, and {bot} welcomes you back.
- **One server at a time:** a note in one server says nothing in another.
- **Quietly:** nobody is pinged by the notice, and one channel is told about you at most once every {fact:afk.noticeEvery}.
- **Short:** a note can be up to {fact:afk.maxNote} characters. One you never come back to clear is deleted after {fact:afk.keep}.
