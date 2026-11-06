---
id: backup-and-copy
title: Back up a server's settings, or copy them to another
topic: dashboard
keywords: backup, back up, export, import, restore settings, copy settings, copy setup, clone server, settings file, another server, same setup
questions: How do I back up my server's settings? | Can I copy my setup to another server? | How do I restore settings from a backup? | Can I export my settings to a file?
related: dashboard-tour
---
The dashboard can save a server's settings to a file, put them back later, or copy another server's setup across. Open your server, then **Back up and copy** in the sidebar.

### Saving a backup
Press **Download a backup**. The file holds how {bot} is set up — welcome, levelling, the starboard, raid protection, the prefix and the rest — and no messages and nobody's data. A section you are not allowed to read is left out, and the page says which.

### Bringing settings in
Choose a backup file, or pick another server you manage and press **Read its settings**. Nothing changes yet: the page lists each section, says what it would change and which channels and roles it could not find, and leaves ticked only what is different. Press **Apply** to save what is ticked.
- **Channels and roles are matched by name**, because another server's have different ids. Anything with no match here stays as it is.
- **Each section is saved the way its own screen saves it**, so the same permissions apply, and a section you could not change by hand is refused and says why.
- Every section saved is a change on the [Changes page](/guilds), so it can be put back from there.

> A backup cannot hold tickets, giveaways, role menus or posts. It is how {bot} is set up, not what it has posted.
