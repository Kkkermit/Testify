import {
	ActionRowBuilder,
	MessageFlags,
	ModalBuilder,
	type ModalActionRowComponentBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { strings } from "../../../config/strings";
import { defineComponent } from "../../../core/component";
import { encodeId, Namespace } from "../../../core/customId";
import { UserFacingError } from "../../../core/errors";
import {
	getPendingCode,
	getVerifyConfig,
	issueCode,
	isVerified,
	markVerified,
} from "../../../database/repositories/verificationRepository";
import { successEmbed } from "../../../ui/embeds";

/**
 * A short code entered through a modal replaces the previous captcha image
 * pipeline, which pulled in a native canvas dependency for one feature.
 */
export default defineComponent({
	namespace: Namespace.Verify,

	async handle(ctx) {
		const guild = ctx.interaction.guild;
		if (!guild) throw new UserFacingError(strings.generic.guildOnly);

		const config = await getVerifyConfig(guild.id);
		if (!config) throw new UserFacingError("Verification is not set up in this server.");

		if (ctx.action === "start") {
			if (!ctx.interaction.isButton()) return;

			if (await isVerified(guild.id, ctx.interaction.user.id)) {
				throw new UserFacingError(strings.verification.alreadyVerified);
			}

			const code = await issueCode(guild.id, ctx.interaction.user.id);

			const modal = new ModalBuilder()
				.setCustomId(encodeId(Namespace.Verify, "submit"))
				.setTitle(`Verification code: ${code}`)
				.addComponents(
					new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("code")
							.setLabel("Type the code shown in the title")
							.setStyle(TextInputStyle.Short)
							.setMinLength(6)
							.setMaxLength(6)
							.setRequired(true),
					),
				);

			await ctx.interaction.showModal(modal);
			return;
		}

		if (ctx.action !== "submit" || !ctx.interaction.isModalSubmit()) return;

		const pending = await getPendingCode(guild.id, ctx.interaction.user.id);
		const supplied = ctx.interaction.fields.getTextInputValue("code").trim().toUpperCase();

		if (pending?.code !== supplied) throw new UserFacingError(strings.verification.wrongCode);

		const member = await guild.members.fetch(ctx.interaction.user.id).catch(() => null);
		if (!member) throw new UserFacingError("I could not find you in this server.");

		await member.roles.add(config.roleId, "Verification passed");
		await markVerified(guild.id, ctx.interaction.user.id);

		await ctx.interaction.reply({
			embeds: [successEmbed(strings.verification.success)],
			flags: MessageFlags.Ephemeral,
		});
	},
});
