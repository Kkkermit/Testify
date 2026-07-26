import { Client, Collection, type GatewayIntentBits, type Partials } from "discord.js";
import { type Env } from "../config/env";
import { type SharedCommand } from "./command";
import { type ComponentHandler } from "./component";
import { type Logger } from "./logger";
import { MessagePipeline } from "./messagePipeline";
import { TimerRegistry } from "./timers";

export interface ClientOptions {
	intents: GatewayIntentBits[];
	partials: Partials[];
	env: Env;
	logger: Logger;
}

/**
 * Replaces the twenty ad-hoc properties the previous code monkey-patched onto
 * `Client`. Everything optional here is genuinely optional — an integration that
 * is not configured is simply absent, rather than silently `null`.
 */
export class TestifyClient extends Client {
	readonly commands = new Collection<string, SharedCommand>();
	/** Prefix aliases → canonical command name. */
	readonly aliases = new Collection<string, string>();
	readonly components = new Collection<string, ComponentHandler>();

	readonly env: Env;
	readonly logger: Logger;
	readonly timers: TimerRegistry;
	readonly messages: MessagePipeline;
	readonly startedAt = Date.now();

	/** Populated by the feature modules that own them; never created ad hoc at a call site. */
	readonly state = new Map<string, unknown>();

	constructor(options: ClientOptions) {
		super({ intents: options.intents, partials: options.partials });
		this.env = options.env;
		this.logger = options.logger;
		this.timers = new TimerRegistry(options.logger);
		this.messages = new MessagePipeline(options.logger);
	}

	isOwner(userId: string): boolean {
		return this.env.DISCORD_OWNER_IDS.includes(userId);
	}

	/**
	 * Typed, lazily-created feature state. Keeps per-feature maps out of the client
	 * surface while still giving them one owner and one creation site.
	 */
	featureState<T>(key: string, create: () => T): T {
		const existing = this.state.get(key);
		if (existing !== undefined) return existing as T;
		const created = create();
		this.state.set(key, created);
		return created;
	}

	resolveCommand(name: string): SharedCommand | undefined {
		const direct = this.commands.get(name);
		if (direct) return direct;
		const aliased = this.aliases.get(name);
		return aliased !== undefined ? this.commands.get(aliased) : undefined;
	}
}
