import { LabelBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { strings } from "@config/strings";
import { customId, defineButton } from "@core/button";
import { checkOpenControl, refusalText } from "@core/checks";
import { UserFacingError } from "@core/errors";
import {
	getPendingCode,
	getVerifyConfig,
	issueCode,
	isVerified,
	markVerified,
} from "@database/repositories/verificationRepository";
import { successEmbed } from "@lib/discord";
import { pickProblem } from "@lib/roles";

export default defineButton({
	id: "verify",

	async run(interaction, context) {
		const guild = interaction.guild;
		if (!guild) throw new UserFacingError(strings.generic.guildOnly);

		// Anybody may press it, so it passes what every open control does: the pause, the blacklist and `/verify`'s switch.
		const refused = await checkOpenControl(
			context.client,
			{ userId: interaction.user.id, guildId: guild.id, locale: interaction.locale },
			"verify",
		);
		if (refused !== null) throw new UserFacingError(refusalText(refused));

		const config = await getVerifyConfig(guild.id);
		if (!config) throw new UserFacingError("Verification is not set up in this server.");

		if (context.action === "start") {
			if (!interaction.isButton()) return;

			if (await isVerified(guild.id, interaction.user.id)) {
				throw new UserFacingError(strings.verification.alreadyVerified);
			}

			const code = await issueCode(guild.id, interaction.user.id);

			const modal = new ModalBuilder()
				.setCustomId(customId("verify", "submit"))
				.setTitle(`Verification code: ${code}`)
				.addLabelComponents(
					new LabelBuilder()
						.setLabel("Type the code shown in the title")
						.setTextInputComponent(
							new TextInputBuilder()
								.setCustomId("code")
								.setStyle(TextInputStyle.Short)
								.setMinLength(6)
								.setMaxLength(6)
								.setRequired(true),
						),
				);

			await interaction.showModal(modal);
			return;
		}

		if (context.action !== "submit" || !interaction.isModalSubmit()) return;

		const pending = await getPendingCode(guild.id, interaction.user.id);
		const supplied = interaction.fields.getTextInputValue("code").trim().toUpperCase();

		if (pending?.code !== supplied) throw new UserFacingError(strings.verification.wrongCode);

		const member = await guild.members.fetch(interaction.user.id).catch(() => null);
		if (!member) throw new UserFacingError("I could not find you in this server.");

		// Asked on every pass, because the role can be moved above the bot or given moderation permissions after setup.
		const problem = pickProblem(guild.roles.cache.get(config.roleId), guild);
		if (problem !== null) throw new UserFacingError(`${problem} Ask the staff to choose another role for verifying.`);

		await member.roles.add(config.roleId, "Verification passed");
		await markVerified(guild.id, interaction.user.id);

		await interaction.reply({
			embeds: [successEmbed(strings.verification.success)],
			flags: MessageFlags.Ephemeral,
		});
	},
});
