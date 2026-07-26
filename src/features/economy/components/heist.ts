import { ECONOMY } from "../../../config/constants";
import { defineComponent } from "../../../core/component";
import { Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import { findAccount } from "../../../database/repositories/economyRepository";
import { embed } from "../../../ui/embeds";
import { Category } from "../../../config/categories";
import { formatNumber } from "../../../ui/format";
import { activeHeists } from "../services/heistState";

export default defineComponent({
	namespace: Namespace.Heist,

	async handle(ctx) {
		if (!ctx.interaction.isButton()) return;

		const [guildId] = ctx.args;
		if (guildId === undefined) throw new UserFacingError("That heist has already finished.");

		const heists = activeHeists(ctx.client);
		const state = heists.get(guildId);
		if (!state) throw new UserFacingError("That heist has already finished.");

		if (ctx.action === "start") {
			const [, leaderId] = ctx.args;
			if (leaderId !== ctx.interaction.user.id) {
				throw new UserFacingError("Only the person who started the heist can begin it early.");
			}
			ctx.client.timers.clear(`heist:${guildId}`);
			await ctx.interaction.deferUpdate();
			return;
		}

		if (ctx.action !== "join") return;

		if (state.participants.has(ctx.interaction.user.id)) {
			throw new UserFacingError("You are already part of this crew.");
		}
		if (state.participants.size >= ECONOMY.heistMaxPlayers) {
			throw new UserFacingError("This crew is already full.");
		}

		const account = await findAccount(guildId, ctx.interaction.user.id);
		if (!account || account.wallet < state.stake) {
			throw new UserFacingError(`You need **${formatNumber(state.stake)}** in your wallet to join.`);
		}

		state.participants.add(ctx.interaction.user.id);

		await ctx.interaction.update({
			embeds: [
				embed({
					category: Category.Economy,
					title: "\u{1f3ad} Heist forming",
					description: [
						`<@${state.leaderId}> is putting a crew together.`,
						"",
						`**Stake:** ${formatNumber(state.stake)} each`,
						`**Crew:** ${state.participants.size} / ${ECONOMY.heistMaxPlayers}`,
						"",
						[...state.participants].map((id) => `<@${id}>`).join(", "),
					].join("\n"),
				}),
			],
		});
	},
});
