import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { findDirectMessage } from "@database/repositories/profileRepository";
import { DM_LOG_ID, dmLogMessage, dmLogRow, loggedUser } from "@lib/bot";
import { modalForm } from "@lib/discord";
import { escapeMarkdown } from "@lib/format";
import { userInfoEmbed } from "@lib/info";

/** The DM log's controls: the sender's details and back, and a reply sent as the bot. */
export default defineButton({
	id: DM_LOG_ID,

	async run(interaction, context) {
		const { client } = context;
		// Reply speaks as the bot, so only the people who own it may use any of these.
		if (!client.isOwner(interaction.user.id)) throw new UserFacingError("Only the bot's owners can use these.");

		const [authorId] = context.args;
		if (authorId === undefined) throw new UserFacingError("That button is no longer valid.");
		const author = await client.users.fetch(authorId).catch(() => null);
		if (author === null) throw new UserFacingError("I could not find that user any more.");

		switch (context.action) {
			case "info":
				if (!interaction.isButton()) return;
				await interaction.update({ embeds: [userInfoEmbed(author, null)], components: dmLogRow(authorId, "user") });
				return;

			case "back": {
				if (!interaction.isButton()) return;
				const dm = await findDirectMessage(interaction.message.id);
				if (dm === null) throw new UserFacingError("I no longer have that message on record.");
				await interaction.update(
					dmLogMessage(loggedUser(author), {
						content: dm.content,
						sentAt: dm.createdAt,
						attachmentUrls: dm.attachmentUrls,
					}),
				);
				return;
			}

			case "reply":
				if (!interaction.isButton()) return;
				await interaction.showModal(
					modalForm({
						id: DM_LOG_ID,
						action: "send",
						args: [authorId],
						title: `Reply to ${author.globalName ?? author.username}`,
						fields: [{ id: "text", label: "Your reply, sent as the bot", paragraph: true, maxLength: 2_000 }],
					}),
				);
				return;

			case "send": {
				if (!interaction.isModalSubmit()) return;
				const text = interaction.fields.getTextInputValue("text").trim();
				if (text === "") throw new UserFacingError("There was nothing to send.");

				try {
					await author.send({ content: text, allowedMentions: { parse: [] } });
				} catch (error) {
					if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
						throw new UserFacingError(
							`**@${escapeMarkdown(author.username)}** does not accept direct messages from the bot, so nothing was sent.`,
						);
					}
					throw error;
				}

				client.logger.info({ userId: author.id, by: interaction.user.id }, "[DM_LOG] Replied to a direct message");
				await interaction.reply({
					content: `Sent to **@${escapeMarkdown(author.username)}**:\n>>> ${text}`,
					flags: MessageFlags.Ephemeral,
					allowedMentions: { parse: [] },
				});
				return;
			}

			default:
				return;
		}
	},
});
