# One command, two surfaces

Discord gives a bot two ways to be spoken to. Slash commands are the modern one: Discord draws a menu, checks the
options' types and limits, and hands the bot a structured interaction. Prefix commands are the old one, `!ban
@someone spamming` typed into a channel, and a lot of people still prefer them because they are fast to type and
work from muscle memory.

Most bots that support both end up writing every command twice. Testify's first version did: 46 commands existed as
a slash file and a prefix file, kept in step by hand, and they drifted. A fix landed in one and not the other, a
permission check existed on one surface only, and every new command was two pieces of work.

The TypeScript rewrite was built around not doing that. There are 91 commands and 150 subcommands, and each is
written once.

## A command is written against a contract, not against Discord

A command is one default export. Here is the whole of `/ping`:

```ts
export default defineCommand({
	name: "ping",
	description: "Checks the bot's latency.",
	category: "info",
	private: true,
	aliases: ["latency"],

	async run(interaction, client) {
		const sentAt = Date.now();
		await reply(interaction, { embeds: [embed({ category: "info", description: "Pinging…" })] });
		const roundTrip = Date.now() - sentAt;
		// …edits the reply with the gateway ping and the round trip
	},
});
```

The `interaction` it receives is not a discord.js `ChatInputCommandInteraction`. It is a `CommandInput`, a
deliberately small interface in [`src/core/command.ts`](../../src/core/command.ts) that both surfaces can satisfy:

```ts
export interface CommandInput {
	readonly user: User;
	readonly member: GuildMember | APIInteractionGuildMember | null;
	readonly guild: Guild | null;
	readonly channel: TextBasedChannel | null;
	readonly options: CommandInputOptions;
	reply(options: InteractionReplyOptions): Promise<unknown>;
	editReply(options: InteractionEditReplyOptions | string): Promise<unknown>;
	followUp(options: InteractionReplyOptions): Promise<unknown>;
	// …and a few more
}
```

A real slash interaction already has this shape, so it is passed through as it is. The prefix surface builds an
object with the same shape out of a message.

## Only one file knows prefix commands exist

That object is built in [`src/core/prefix.ts`](../../src/core/prefix.ts), and nothing else in the codebase
mentions prefixes. It does three things:

1. **Finds the command.** The prefix is matched in any case, so `T?help`, which is what a phone's
   auto-capitalisation types, still runs `t?help`. A command's name or any of its 107 aliases resolve to it.
2. **Reads the options from text, against the command's own declaration.** `t?ban @someone spamming` is split up
   according to the options `/ban` declares, so `options.getUser("user")` and `options.getString("reason")` answer
   the same way on both surfaces. Anybody given as an ID or a mention who is not in the cache is fetched first, so
   `t?ban <id>` reaches people who have already left.
3. **Maps the replies.** `reply`, `editReply` and `followUp` become a reply to the message and edits of it.

Then it calls the same `run`. The gates in front of it are the same too: permissions, cooldowns, `guildOnly`, the
blacklist and a server's command switches all run in [`src/core/checks.ts`](../../src/core/checks.ts), before
either surface reaches the command.

## The places the two surfaces really differ

Pretending a message is an interaction only works if the differences are handled honestly rather than ignored.

- **A message cannot be private.** A slash command can answer only the person who ran it. A command marked
  `private: true` does that on the slash side. On the prefix side the reply and the message that ran it delete
  themselves after 20 seconds, with a `<t:…:R>` countdown saying so.
- **A message has no language.** An interaction carries the reader's own Discord locale; a message does not. The
  replies every command shares come in eight languages, and a prefix run falls back to the server's preferred
  locale.
- **Discord validates slash options, and nothing validates text.** This is the one that mattered most, and
  [it got its own article](a-negative-number-that-minted-money.md). Discord refuses `/lottery enter tickets:-5`
  because the option says `min: 1`. Text has no such gate, so the prefix surface now enforces every declared
  `min`, `max`, `choices` and `maxLength` itself:

  ```ts
  /** Discord refuses a slash command's value outside its declaration; nothing else does, so this does. */
  private withinDeclaration<T extends string | number>(name: string, value: T): T {
  	const option = this.declaration(name);
  	if (option === undefined) return value;
  	// …choices are matched in any case, and numbers and lengths are held to their bounds
  }
  ```

## Running out of room

Discord allows a bot 100 top-level commands. Rather than ration features, a command can be folded under a parent
with `asSubcommand`. The folded file is still an ordinary command file, and it keeps its own name as a prefix
alias, so `t?dad-joke` works beside `/fun dad-joke`.

## What it buys

- **One implementation per command.** A fix lands everywhere at once, and a new command is one file the loader
  finds, `/help` lists and both surfaces run.
- **One set of gates.** A permission is declared on the command and checked the same way on both surfaces.
- **Tests that cover both surfaces.** `tests/core/prefix.test.ts` walks every bounded option in the registry, just
  past its bound and on it, so a command added next year is covered with no edit.

The cost is one adapter file that has to understand Discord's interaction model well enough to imitate it. That is
a much smaller thing to get right than 46 pairs of files.

---

_Testify is an open-source Discord bot with a web dashboard. The code is on
[GitHub](https://github.com/Kkkermit/Testify), and a star there helps other people find it._
