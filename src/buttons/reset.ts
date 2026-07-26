import { defineButton } from "../core/button";
import { UserFacingError } from "../core/errors";
import { resetGuild } from "../database/repositories/economyRepository";
import { resetGuildLevels } from "../database/repositories/levelRepository";
import { successEmbed } from "../lib/embeds";
import { formatNumber } from "../lib/format";

export default defineButton({
	id: "reset",
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton()) return;

		const guildId = interaction.guildId;
		if (guildId === null) throw new UserFacingError("This only works inside a server.");

		if (context.action.endsWith("-no")) {
			await interaction.update({ embeds: [successEmbed("Cancelled. Nothing was deleted.")], components: [] });
			return;
		}

		if (context.action === "economy-yes") {
			const removed = await resetGuild(guildId);
			await interaction.update({
				embeds: [successEmbed(`Deleted **${formatNumber(removed)}** economy account(s).`)],
				components: [],
			});
			return;
		}

		if (context.action === "levels-yes") {
			const removed = await resetGuildLevels(guildId);
			await interaction.update({
				embeds: [successEmbed(`Reset **${formatNumber(removed)}** member level(s).`)],
				components: [],
			});
		}
	},
});
