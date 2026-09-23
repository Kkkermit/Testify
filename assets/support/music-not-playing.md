---
id: music-not-playing
title: Music is not playing
topic: music
keywords: music not working, no sound, silent, bot not joining voice, cannot play, video unavailable, music stopped, nothing plays
questions: Why is the music not playing? | The bot will not join my voice channel | Why did the song stop?
commands: music, play
related: music-access, music, bot-permissions
---
### Check these first
1. **Are you in a voice channel?** Join one before running `/play`.
2. **Can the bot join it?** It needs **Connect** and **Speak** there, and the channel must not be full.
3. **Is music switched on?** A server can turn it off, or limit it to DJ roles.
4. **Is the track available?** Private and removed videos cannot be played, and the player shows the reason for a minute.

### Still nothing
`/music status` shows which players the host has installed and how old they are. If it reports something missing, only the person who hosts the bot can fix it.
