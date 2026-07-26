import { randomInt } from "node:crypto";
import { ButtonStyle } from "discord.js";
import { Category } from "../../../config/categories";
import { ECONOMY, ECONOMY_COOLDOWNS } from "../../../config/constants";
import { defineCommand } from "../../../core/command";
import { encodeId, Namespace } from "../../../core/customId";
import { CooldownError, UserFacingError } from "../../../core/errors";
import { requireGuild } from "../../../core/guards";
import { getOrCreateAccount } from "../../../database/repositories/economyRepository";
import { button, row } from "../../../ui/components";
import { embed } from "../../../ui/embeds";
import { formatDuration, formatNumber } from "../../../ui/format";
import { type CommandContext } from "../../../core/context";
import { activeHeists, type HeistState } from "../services/heistState";

export default defineCommand({
	name: "heist",
	description: "Starts a group heist that other members can join.",
	category: Category.Economy,
	surfaces: ["slash", "prefix"],
	guildOnly: true,
	options: [
		{
			name: "stake",
			description: `How much each member puts in (min ${ECONOMY.heistMinPlayers * 100}).`,
			type: "integer",
			minValue: 100,
			maxValue: 100_000,
		},
	],

	async execute(ctx) {
		const guild = requireGuild(ctx);
		const account = await getOrCreateAccount(guild.id, ctx.user.id);
		const now = Date.now();

		if (account.lastHeist !== null) {
			const readyAt = account.lastHeist.getTime() + ECONOMY_COOLDOWNS.heist;
			if (now < readyAt) {
				throw new CooldownError(
					readyAt - now,
					`The heat has not died down. Try again in **${formatDuration(readyAt - now)}**.`,
				);
			}
		}

		const heists = activeHeists(ctx.client);
		if (heists.has(guild.id)) throw new UserFacingError("A heist is already being organised in this server.");

		const stake = ctx.options.getInteger("stake") ?? 500;
		if (account.wallet < stake)
			throw new UserFacingError(`You need **${formatNumber(stake)}** in your wallet to start this.`);

		const state: HeistState = {
			guildId: guild.id,
			leaderId: ctx.user.id,
			stake,
			participants: new Set([ctx.user.id]),
			startedAt: now,
			messageId: null,
		};
		heists.set(guild.id, state);

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Economy,
					title: "\u{1f3ad} Heist forming",
					description: [
						`${ctx.user} is putting a crew together.`,
						"",
						`**Stake:** ${formatNumber(stake)} each`,
						`**Crew:** ${state.participants.size} / ${ECONOMY.heistMaxPlayers}`,
						"",
						`Joining closes in ${formatDuration(ECONOMY.heistJoinWindowMs)}.`,
					].join("\n"),
				}),
			],
			components: [
				row(
					button({
						id: encodeId(Namespace.Heist, "join", guild.id),
						label: "Join the crew",
						style: ButtonStyle.Success,
					}),
					button({
						id: encodeId(Namespace.Heist, "start", guild.id, ctx.user.id),
						label: "Start now",
						style: ButtonStyle.Primary,
					}),
				),
			],
		});

		const reply = await ctx.fetchReply();
		state.messageId = reply?.id ?? null;

		// The window is registered so shutdown clears it rather than leaving a
		// dangling timer, and the state is always cleaned up.
		ctx.client.timers.timeout(`heist:${guild.id}`, ECONOMY.heistJoinWindowMs, async () => {
			const pending = heists.get(guild.id);
			if (!pending) return;
			heists.delete(guild.id);

			if (pending.participants.size < ECONOMY.heistMinPlayers) {
				await ctx.followUp({
					embeds: [
						embed({
							category: Category.Economy,
							title: "Heist called off",
							description: `Not enough people showed up. You need at least ${ECONOMY.heistMinPlayers}.`,
						}),
					],
				});
				return;
			}

			await resolveHeist(ctx, pending);
		});
	},
});

async function resolveHeist(ctx: CommandContext, state: HeistState): Promise<void> {
	const { adjustWallet, debitWallet, incrementCounters, setCooldown } =
		await import("../../../database/repositories/economyRepository");

	const paid: string[] = [];
	for (const userId of state.participants) {
		const debited = await debitWallet(state.guildId, userId, state.stake);
		if (debited) paid.push(userId);
	}

	if (paid.length < ECONOMY.heistMinPlayers) {
		for (const userId of paid) await adjustWallet(state.guildId, userId, state.stake);
		await ctx.followUp({
			embeds: [
				embed({
					category: Category.Economy,
					title: "Heist called off",
					description: "Too many of the crew could not cover the stake. Everyone has been refunded.",
				}),
			],
		});
		return;
	}

	// More people means better odds, capped so a full crew is not a guaranteed win.
	const chance = Math.min(0.75, 0.3 + paid.length * 0.08);
	const succeeded = Math.random() < chance;
	const pot = state.stake * paid.length;

	for (const userId of paid) {
		await setCooldown(state.guildId, userId, "heist", new Date());
		await incrementCounters(state.guildId, userId, succeeded ? { heistSuccess: 1 } : { heistFailed: 1 });
	}

	if (!succeeded) {
		await ctx.followUp({
			embeds: [
				embed({
					category: Category.Economy,
					title: "\u{1f6a8} The heist failed",
					description: `Security caught the crew. The whole pot of **${formatNumber(pot)}** is gone.`,
					fields: [{ name: "Crew", value: paid.map((id) => `<@${id}>`).join(", ") }],
				}),
			],
		});
		return;
	}

	const multiplier = 1.5 + randomInt(0, 100) / 100;
	const payout = Math.floor((pot * multiplier) / paid.length);

	for (const userId of paid) await adjustWallet(state.guildId, userId, payout);

	await ctx.followUp({
		embeds: [
			embed({
				category: Category.Economy,
				title: "\u{1f4b0} The heist succeeded",
				description: `The crew got away with **${formatNumber(payout * paid.length)}**.`,
				fields: [
					{ name: "Each member receives", value: formatNumber(payout), inline: true },
					{ name: "Crew", value: paid.map((id) => `<@${id}>`).join(", ") },
				],
			}),
		],
	});
}
