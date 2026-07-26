import { defineComponent } from "../../../core/component";
import { Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import { resetGuild } from "../../../database/repositories/economyRepository";
import { resetGuildLevels } from "../../../database/repositories/levelRepository";
import { successEmbed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

export default defineComponent({
	namespace: Namespace.Reset,
	ownerOnly: true,

	async handle(ctx) {
		if (!ctx.interaction.isButton()) return;

		const guildId = ctx.interaction.guildId;
		if (guildId === null) throw new UserFacingError("This only works inside a server.");

		if (ctx.action.endsWith("-no")) {
			await ctx.interaction.update({ embeds: [successEmbed("Cancelled. Nothing was deleted.")], components: [] });
			return;
		}

		if (ctx.action === "economy-yes") {
			const removed = await resetGuild(guildId);
			await ctx.interaction.update({
				embeds: [successEmbed(`Deleted **${formatNumber(removed)}** economy account(s).`)],
				components: [],
			});
			return;
		}

		if (ctx.action === "levels-yes") {
			const removed = await resetGuildLevels(guildId);
			await ctx.interaction.update({
				embeds: [successEmbed(`Reset **${formatNumber(removed)}** member level(s).`)],
				components: [],
			});
		}
	},
});
