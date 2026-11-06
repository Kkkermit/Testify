import { MessageFlags } from "discord.js";
import { defineButton } from "@core/button";
import { checkContextMenu } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { refusalEmbed } from "@lib/discord";
import { MODERATION_FORM_ID, TIMEOUT_MENU, timeoutFromMenu, WARN_MENU, warnFromMenu } from "@lib/moderation";

export default defineButton({
	id: MODERATION_FORM_ID,
	ownerOnly: true,

	async run(interaction, { client, action, args }) {
		if (!interaction.isModalSubmit() || !interaction.inCachedGuild()) return;
		const [targetId] = args;
		if (targetId === undefined || (action !== "warn" && action !== "timeout")) return;

		// A role can change while the form is open, so the press's gates are asked again.
		const refusal = await checkContextMenu(client, interaction, action === "warn" ? WARN_MENU : TIMEOUT_MENU);
		if (refusal !== null) {
			await interaction.reply({ embeds: [refusalEmbed(refusal)], flags: MessageFlags.Ephemeral });
			return;
		}

		const target = await client.users.fetch(targetId).catch(() => null);
		if (target === null) throw new UserFacingError("Discord no longer knows that account.");
		const reason = interaction.fields.getTextInputValue("reason").trim();

		const answer =
			action === "warn"
				? await warnFromMenu(interaction.member, target, reason)
				: await timeoutFromMenu(
						interaction.member,
						target,
						interaction.fields.getTextInputValue("duration").trim(),
						reason,
					);
		await interaction.reply({ embeds: [answer], flags: MessageFlags.Ephemeral });
	},
});
