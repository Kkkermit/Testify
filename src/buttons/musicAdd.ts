import { type GuildMember, MessageFlags } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { checkMusicControl, refusalText } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { modalForm, successEmbed } from "@lib/discord";
import { findSession, MUSIC_ADD_ID, queueRequest, requestedQuery, sameChannelAs, voiceChannelOf } from "@lib/music";

const QUERY_FIELD = "query";

/** Re-checked on the submit as well, because a form can sit open while a role or a switch changes. */
async function requireMusicAccess(interaction: ComponentInteraction, client: TestifyClient): Promise<GuildMember> {
	const guild = interaction.guild;
	if (guild === null) throw new UserFacingError("This only works inside a server.");

	const member = interaction.member as GuildMember;
	const refusal = await checkMusicControl(client, { userId: interaction.user.id, guildId: guild.id, member });
	if (refusal !== null) throw new UserFacingError(refusalText(refusal));

	voiceChannelOf(member);
	const session = findSession(guild.id);
	if (session !== null) sameChannelAs(session, member);

	return member;
}

export default defineButton({
	id: MUSIC_ADD_ID,

	async run(interaction, { client, action }) {
		if (action === "open" && interaction.isButton()) {
			await requireMusicAccess(interaction, client);
			await interaction.showModal(
				modalForm({
					id: MUSIC_ADD_ID,
					action: "submit",
					title: "Add to the queue",
					fields: [
						{
							id: QUERY_FIELD,
							label: "A link, or what to search for",
							placeholder: "Artist and title, or a YouTube or SoundCloud link",
							maxLength: 500,
						},
					],
				}),
			);
			return;
		}

		if (action !== "submit" || !interaction.isModalSubmit()) return;

		const member = await requireMusicAccess(interaction, client);
		const query = requestedQuery(interaction.fields.getTextInputValue(QUERY_FIELD));
		const guild = interaction.guild;
		if (guild === null) return;

		// Resolving spawns yt-dlp, which outlasts the three seconds a modal submit is given.
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const { session, note } = await queueRequest({
			guild,
			client,
			channel: voiceChannelOf(member),
			query,
			requestedBy: interaction.user.id,
			next: false,
			textChannelId: interaction.channelId,
		});

		await session.refreshPanel();
		await interaction.editReply({ embeds: [successEmbed(note)] });
	},
});
