import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { type Env } from "@config/env";
import { type Button } from "@core/button";
import { type Command } from "@core/command";
import { type Logger } from "@core/logger";
import { type MessageHandler } from "@core/message";

export const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildModeration,
	GatewayIntentBits.GuildExpressions,
	GatewayIntentBits.GuildVoiceStates,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.GuildMessageReactions,
	GatewayIntentBits.DirectMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.AutoModerationConfiguration,
];

export const partials = [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction];

/**
 * The bot. Everything the rest of the code needs hangs off here, and it is all
 * typed — nothing is attached at runtime.
 */
export class TestifyClient extends Client {
	/** Every loaded command, by name. */
	readonly commands = new Collection<string, Command>();
	/** Alternative prefix-command names, pointing at the command they belong to. */
	readonly aliases = new Collection<string, string>();
	/** Button, select-menu and modal handlers, by custom-ID prefix. */
	readonly buttons = new Collection<string, Button>();
	/** Things that run on every message, in order. */
	readonly messageHandlers: MessageHandler[] = [];

	/** What the loader found, filled in by `loadEverything()` and shown on the banner. */
	loaded: { commands: number; buttons: number; events: number; messageHandlers: number } = {
		commands: 0,
		buttons: 0,
		events: 0,
		messageHandlers: 0,
	};

	readonly env: Env;
	readonly logger: Logger;
	readonly timers = new TimerRegistry();
	readonly startedAt = Date.now();

	constructor(env: Env, logger: Logger) {
		super({ intents, partials });
		this.env = env;
		this.logger = logger;
	}

	isOwner(userId: string): boolean {
		return this.env.DISCORD_OWNER_IDS.includes(userId);
	}
}

/**
 * Every repeating or delayed task is registered here so shutdown can stop it.
 * Use `every` for something that repeats and `after` for a one-off.
 */
export class TimerRegistry {
	private readonly handles = new Map<string, NodeJS.Timeout>();
	private readonly running = new Set<string>();

	/** Repeats forever. A run is skipped if the previous one is still going. */
	every(name: string, ms: number, task: () => Promise<void> | void): void {
		this.stop(name);

		this.handles.set(
			name,
			setInterval(() => {
				if (this.running.has(name)) return;
				this.running.add(name);
				void run(task).finally(() => this.running.delete(name));
			}, ms),
		);
	}

	/** Runs once, then forgets itself. */
	after(name: string, ms: number, task: () => Promise<void> | void): void {
		this.stop(name);

		this.handles.set(
			name,
			setTimeout(() => {
				this.handles.delete(name);
				void run(task);
			}, ms),
		);
	}

	stop(name: string): void {
		const handle = this.handles.get(name);
		if (handle === undefined) return;

		clearTimeout(handle);
		clearInterval(handle);
		this.handles.delete(name);
	}

	stopAll(): void {
		for (const name of [...this.handles.keys()]) this.stop(name);
	}

	get size(): number {
		return this.handles.size;
	}

	names(): string[] {
		return [...this.handles.keys()];
	}
}

/** A task that throws must never take the process down with it. */
async function run(task: () => Promise<void> | void): Promise<void> {
	try {
		await task();
	} catch {
		// Deliberately swallowed: a background job is not worth crashing for.
	}
}
