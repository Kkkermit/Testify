---
id: goodbye
title: Saying goodbye when members leave
topic: setup
keywords: goodbye, leave message, farewell, member left, leaving, leaves, bye, departure
questions: How do I set up a goodbye message? | Can the bot say when someone leaves? | How do I turn off leave messages?
commands: welcome
related: welcome
---
{bot} can post a message when somebody leaves, in a channel you choose.

### In Discord
Run `/welcome goodbye` to open the goodbye panel. Pick the channel, edit the message, choose plain text or an embed, and turn it on. **Preview** shows you the goodbye as it would read for you.

### On the dashboard
Open your server, then **Welcome** under Community. The goodbye card is under the greeting.

### Placeholders
The same as the greeting: `{user}`, `{username}`, `{server}` and `{count}`, which is how many members are left. Nobody is pinged, because the member has already gone. A mention of somebody who has left can show as an unknown user, so `{username}` usually reads better.

The message can be up to {fact:welcome.maxMessage} characters.
