import { setTimeout as sleep } from "node:timers/promises";
import {
	AuditLogEvent,
	DiscordAPIError,
	type Guild,
	type MessageCreateOptions,
	PermissionFlagsBits,
	RESTJSONErrorCodes,
	type User,
} from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { instanceConfig } from "@config/instance";
import { botName } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { findBlacklistEntry } from "@database/repositories/blacklistRepository";
import { getPrefix } from "@database/repositories/prefixRepository";
import { dashboardUrl } from "@lib/bot/dashboard.util";
import { projectLinkButtons } from "@lib/bot/projectLinks.util";
import { linkButton, row } from "@lib/discord/components.util";
import { embed } from "@lib/discord/embeds.util";
import { escapeMarkdown } from "@lib/format/format.util";

/** Discord writes the audit entry a moment after the join reaches the bot, so a first read can come back without it. */
const AUDIT_RETRY_MS = 3_000;
/** An entry older than this records an earlier time the bot was added, not this one. */
const FRESH_MS = 10 * MINUTE_MS;

export type InviterSource = "audit log" | "integration" | "owner";

export interface BotAddEntry {
	targetId: string | null;
	executorId: string | null;
	createdTimestamp: number;
}

/** The newest entry that added this bot, if it is recent enough to be the join that just happened. */
export function pickBotAdd(entries: readonly BotAddEntry[], botId: string, now: number): string | null {
	const newest = entries
		.filter((entry) => entry.targetId === botId && now - entry.createdTimestamp <= FRESH_MS)
		.sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];
	return newest?.executorId ?? null;
}

interface FindOptions {
	wait?: (ms: number) => Promise<unknown>;
	now?: () => number;
}

/** The audit entry every way of adding a bot writes, then the integration for a bot without View Audit Log, then the owner. */
export async function findInviter(
	guild: Guild,
	botId: string,
	{ wait = sleep, now = Date.now }: FindOptions = {},
): Promise<{ user: User; source: InviterSource } | null> {
	const me = guild.members.me;

	if (me?.permissions.has(PermissionFlagsBits.ViewAuditLog) === true) {
		for (const delay of [0, AUDIT_RETRY_MS]) {
			if (delay > 0) await wait(delay);
			// A refusal here falls through to the next way of telling, so it is not an error worth more than that.
			const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 }).catch(() => null);
			const id = logs === null ? null : pickBotAdd([...logs.entries.values()], botId, now());
			// The entry may carry a partial user, so the one written to is fetched whole.
			const user = id === null ? null : await guild.client.users.fetch(id).catch(() => null);
			if (user !== null) return { user, source: "audit log" };
		}
	}

	if (me?.permissions.has(PermissionFlagsBits.ManageGuild) === true) {
		const integrations = await guild.fetchIntegrations().catch(() => null);
		const user = integrations?.find((integration) => integration.account.id === botId)?.user ?? null;
		if (user !== null) return { user, source: "integration" };
	}

	const owner = await guild.fetchOwner().catch(() => null);
	return owner === null ? null : { user: owner.user, source: "owner" };
}

export interface GreetingFacts {
	bot: string;
	server: string;
	prefix: string;
	/** The server's overview on the dashboard, where its setup checklist is; null when the dashboard is off. */
	setupUrl: string | null;
}

export function inviterGreeting(facts: GreetingFacts): MessageCreateOptions {
	const server = escapeMarkdown(facts.server);
	const setUp =
		facts.setupUrl === null
			? "**Set it up** — every feature has a setup command, and `/help` lists them by category."
			: "**Set it up** — the dashboard's setup checklist picks channels for welcomes, logs and more in a few clicks.";

	const lines = [
		"Here's how to get going:",
		"",
		`**See what it can do** — \`/help\`, or \`${facts.prefix}help\` in any channel.`,
		setUp,
		`**Change the prefix** — \`/prefix\`, if \`${facts.prefix}\` clashes with another bot.`,
		"",
		`-# You're getting this because you added ${facts.bot} to ${server}.`,
	];
	const buttons = [
		...(facts.setupUrl === null ? [] : [linkButton("Set up the server", facts.setupUrl)]),
		...projectLinkButtons(),
	];

	return {
		embeds: [
			embed({
				category: "info",
				title: `Thanks for adding ${facts.bot} to ${facts.server}`,
				description: lines.join("\n"),
			}),
		],
		components: [row(...buttons)],
	};
}

/** One direct message to whoever added the bot; closed DMs are their choice, so nothing about this can fail the join. */
export async function greetInviter(client: TestifyClient, guild: Guild, options: FindOptions = {}): Promise<void> {
	const botId = client.user?.id;
	if (botId === undefined || !instanceConfig().greetInviter) return;

	const found = await findInviter(guild, botId, options);
	if (found === null || found.user.bot) return;

	try {
		if ((await findBlacklistEntry(found.user.id)) !== null) return;

		const dashboard = dashboardUrl(client.env);
		const message = inviterGreeting({
			bot: botName(),
			server: guild.name,
			prefix: await getPrefix(guild.id),
			setupUrl: dashboard === null ? null : `${dashboard}/guilds/${guild.id}`,
		});

		await found.user.send(message);
		client.logger.debug({ guildId: guild.id, source: found.source }, "[GUILD] Sent the getting-started message.");
	} catch (error) {
		const closed = error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser;
		if (closed) {
			client.logger.debug({ guildId: guild.id }, "[GUILD] Whoever added the bot has their direct messages closed.");
		} else {
			client.logger.warn(
				{ err: toError(error), guildId: guild.id },
				"[GUILD] Could not send the getting-started message. The bot joined normally.",
			);
		}
	}
}
