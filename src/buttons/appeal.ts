import { PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { checkOpenControl, refusalText } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { APPEAL_COMMAND, APPEAL_ID, decideOnAppeal } from "@lib/appeals";
import { modalForm } from "@lib/discord";
import { APPEAL_LIMITS, appealDecision } from "@testify/shared";

const DECISIONS = { accept: "accepted", refuse: "refused" } as const;

export default defineButton({
	id: APPEAL_ID,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		const refused = await checkOpenControl(
			context.client,
			{ userId: interaction.user.id, guildId: guild.id },
			APPEAL_COMMAND,
		);
		if (refused !== null) throw new UserFacingError(refusalText(refused));

		const [appealId = ""] = context.args;
		const action = context.action.replace(/-save$/, "");
		if (action !== "accept" && action !== "refuse") return;

		// Checked on the press and again on the form, since a role can change while the form is open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers) !== true) {
			throw new UserFacingError("Only staff with the Ban Members permission can decide on appeals.");
		}

		if (interaction.isButton()) {
			await interaction.showModal(
				modalForm({
					id: APPEAL_ID,
					action: `${action}-save`,
					args: [appealId],
					title: action === "accept" ? "Accept and lift the ban" : "Refuse this appeal",
					fields: [
						{
							id: "reason",
							label: action === "accept" ? "Anything to tell them (optional)" : "Why (they are told)",
							paragraph: true,
							required: action === "refuse",
							maxLength: APPEAL_LIMITS.maxReason,
						},
					],
				}),
			);
			return;
		}

		if (!interaction.isModalSubmit() || !interaction.isFromMessage()) return;

		const parsed = appealDecision.safeParse({
			status: DECISIONS[action],
			reason: interaction.fields.getTextInputValue("reason"),
		});
		if (!parsed.success) throw new UserFacingError("Give a reason under 500 characters, without HTML.");

		await interaction.deferUpdate();
		await decideOnAppeal(context.client, guild, appealId, parsed.data, interaction.user);
	},
});
