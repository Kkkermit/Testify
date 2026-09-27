---
id: music-queue
title: Managing the queue
topic: music
keywords: queue, skip, pause, resume, stop, loop, repeat, shuffle, remove track, clear queue, now playing, leave, disconnect, add to queue
questions: How do I skip a song? | How do I loop a song? | How do I see the queue? | How do I make the bot leave? | How do I add a song to the queue?
commands: music
related: music, music-volume
---
All of these are under `/music`, and most have a button on the player panel too.

### Adding to it
- `/play` adds a song. So does **Add to queue** on the player panel, which anybody allowed to use the music system can press.

### Moving through it
- `/music queue` shows what is playing and what is next. `/music nowplaying` shows only the current track.
- `/music skip` jumps to the next track.
- `/music pause` and `/music resume` pause and carry on.

### Changing it
- `/music loop` repeats the current track, the whole queue, or nothing.
- `/music shuffle` shuffles what has not played yet.
- `/music remove` takes out one track by its position in the queue.
- `/music clear` removes everything after the current track.

### Stopping
- `/music stop` stops and clears the queue.
- `/music leave` stops and leaves the voice channel.

Short prefix aliases work too: `{prefix}q`, `{prefix}np`, `{prefix}s` and `{prefix}dc`.
