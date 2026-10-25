import { AFK } from "@config/constants";
import { defineCommand, inGuild } from "@core/command";
import { AFK_COMMAND, awayConfirm, goAway } from "@lib/afk";
import { reply } from "@lib/discord";

/** Marks somebody away in this server until they next send a message here. */
export default defineCommand({
	name: AFK_COMMAND,
	description: "Tells anybody who mentions you that you are away, until you next speak.",
	category: "community",
	guildOnly: true,
	private: true,
	options: [
		{
			name: "note",
			description: "What to tell people, like back at six.",
			type: "string",
			maxLength: AFK.maxNote,
			// The note is somebody's own words, so the operator's logs never see it.
			unlogged: true,
		},
	],
	async run(interaction) {
		const guild = inGuild(interaction);
		const record = await goAway(guild.id, interaction.user.id, interaction.options.getString("note"));

		await reply(interaction, { embeds: [awayConfirm(record)] });
	},
});
