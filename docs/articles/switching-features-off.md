# Switching off a whole feature

People who run their own copy of Testify do not all want everything. Some have no use for music; some do not want
a casino in a server for teenagers. Until 2.3.4 there was no clean way to take a feature out. Music was spread over
80 files in 30 folders, the casino over 73 in 25, so removing one meant editing all over the tree, and the next
update put it back. The owner console could switch a command off, but Discord still listed it in the slash menu,
so members kept finding a command that refused them.

Now it is one line in `.env`:

```env
DISABLED_FEATURES=music,casino
```

After a restart those features are gone from Discord's slash menu, `/help`, the prefix commands, the dashboard's
sidebar, the help articles and the docs, as if they had never been there.

## One declaration per feature

The trick is that each feature says once, in one place, everything it owns. That place is
[`shared/src/botFeatures.ts`](../../shared/src/botFeatures.ts), and it lives in the package the bot and the
dashboard both import, so they read the same list:

```ts
music: {
	label: "Music",
	commands: ["music", "play"],
	buttons: ["music", "musicadd"],
	jobs: ["music-scratch"],
	routes: [guild("music"), "/control/music"],
	screens: [guild("music")],
	articles: ["music", "music-access", "music-not-playing", "music-queue", "music-volume"],
},
```

Commands, buttons, right-click actions, message handlers, events, scheduled jobs, API routes, dashboard screens,
help articles and the rows on the server overview are all listed by name. A command another feature shares is
named down to its subcommand: `/leaderboard economy` belongs to the economy and `/leaderboard levels` to levelling.

## Off means gone, not refused

Everything that registers anything asks the declaration first.

- **The loader** never registers what an off feature owns, and strips the subcommands it owns from shared
  commands. A command left with nothing in it goes too. Discord is then handed a command list without the feature,
  so it disappears from the menu rather than refusing when used.
- **Scheduled jobs** are skipped by name.
- **The API** answers 404 for every route an off feature declares, whoever asks, through one middleware:

  ```ts
  export const refuseSwitchedOff: MiddlewareHandler<ApiBindings> = async (context, next) => {
  	const off = context.get("client").featuresOff;
  	if (off.size > 0 && routeIsOff(off, context.req.path.replace(/^\/api(?=\/|$)/, "")) !== null) throw featureOff();
  	await next();
  };
  ```

- **The dashboard** learns what is off from `/api/site`, and its sidebar, quick search, help page and docs command
  list leave those parts out.

A few things still arrive after a feature is switched off, such as a button on a message posted last week, or a
command Discord's client had cached. Those get a short "this feature is switched off" in the reader's own language
rather than silence.

Two details make it safe to use. **Some features depend on others**: the casino, the lottery and treasure drops
take their money from the economy, so switching the economy off switches those off too, and the start-up log says
so. **A misspelt name stops the bot starting**, with the list of real names, because a typo that silently left a
feature running would be worse than no setting at all. And nothing is deleted: a feature's records stay in the
database, so taking its name out and restarting brings it back as it was.

## Keeping the declaration honest

A declaration like this is only useful while it is true, and the easy way for it to go wrong is for somebody to add
a music button next year without listing it. Then a bot with music switched off would quietly keep answering that
button. So [`tests/core/botFeatures.test.ts`](../../tests/core/botFeatures.test.ts) checks the declaration against
the real bot:

- every part it names exists, so a misspelling is caught;
- no part has two owners;
- a help article that is only about one feature is listed under that feature;
- **any command, button, menu or event that imports a feature's own code is declared under that feature;**
- switching each feature off removes exactly its parts and nothing else;
- every declared route answers 404 when its feature is off.

The fourth is the one that guards the future. It reads each part's source file, finds the `@lib/<folder>` imports
that only one feature uses, and fails if the part is not declared under that feature. Each of these checks was
broken on purpose to watch it go red, because a test that cannot fail is worse than none.

## The bug the test found in itself

That fourth test passed on Linux and macOS and failed on the Windows runner the first time it ran there. A few event
files, such as the member-join handler, are shared by several features and are allowed through by name. The names
were written as `events/create/guildMemberAdd.event.ts`, but on Windows the file search hands back
`events\create\guildMemberAdd.event.ts`, so the allowlist matched nothing and the test reported the shared files as
undeclared. One option fixed it: `posix: true`, which makes the search return forward slashes on every system.

It is a small bug, and exactly the kind CI on Windows exists to catch, since most people who clone the bot do it
on Windows.

---

_Testify is an open-source Discord bot with a web dashboard. The code is on
[GitHub](https://github.com/Kkkermit/Testify), and a star there helps other people find it._
