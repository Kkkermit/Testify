import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { checkOpenControl, refusalText } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { findIdea, voteOnIdea } from "@database/repositories/ideaRepository";
import { modalForm } from "@lib/discord";
import { decideOnIdea, IDEA_COMMAND, IDEA_ID, ideaPost } from "@lib/ideas";
import { IDEA_LIMITS, ideaDecision, type IdeaStatus } from "@testify/shared";

/** The buttons on every posted idea: anybody votes, and staff with Manage Server decide. */

const DECISIONS: Record<string, IdeaStatus> = { accept: "accepted", decline: "declined", reopen: "open" };

export default defineButton({
	id: IDEA_ID,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		const refused = await checkOpenControl(
			context.client,
			{ userId: interaction.user.id, guildId: guild.id },
			IDEA_COMMAND,
		);
		if (refused !== null) throw new UserFacingError(refusalText(refused));

		const [ideaId = ""] = context.args;
		const { action } = context;

		if ((action === "up" || action === "down") && interaction.isButton()) {
			const voted = await voteOnIdea(guild.id, ideaId, interaction.user.id, action);
			if (voted === null) {
				const idea = await findIdea(guild.id, ideaId);
				throw new UserFacingError(idea === null ? "That idea has been deleted." : "Voting has closed on this idea.");
			}

			await interaction.update(ideaPost(voted));
			return;
		}

		const status = DECISIONS[action.replace(/-save$/, "")];
		if (status === undefined) return;

		// Checked on the press and again on the form, since a role can change while the form is open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("Only staff with the Manage Server permission can decide on ideas.");
		}

		if (status !== "open" && interaction.isButton()) {
			await interaction.showModal(
				modalForm({
					id: IDEA_ID,
					action: `${action}-save`,
					args: [ideaId],
					title: status === "accepted" ? "Accept this idea" : "Decline this idea",
					fields: [
						{
							id: "reason",
							label: "Why (the author is told)",
							paragraph: true,
							required: false,
							maxLength: IDEA_LIMITS.maxReason,
						},
					],
				}),
			);
			return;
		}

		const reasonInput = interaction.isModalSubmit() ? interaction.fields.getTextInputValue("reason") : "";
		const parsed = ideaDecision.safeParse({ status, reason: reasonInput });
		if (!parsed.success) throw new UserFacingError("Keep the reason under 500 characters, without HTML.");

		if (interaction.isModalSubmit() && !interaction.isFromMessage()) return;
		await interaction.deferUpdate();
		await decideOnIdea(context.client, guild, ideaId, parsed.data, {
			id: interaction.user.id,
			name: interaction.user.username,
		});
	},
});
