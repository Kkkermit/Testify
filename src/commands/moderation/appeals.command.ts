import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { APPEAL_COMMAND, appealSettingsPanel, readAppealSettings } from "@lib/appeals";
import { reply } from "@lib/discord";

export default defineCommand({
	name: APPEAL_COMMAND,
	description: "Lets banned members appeal on the dashboard, and picks where staff see the appeals.",
	category: "moderation",
	guildOnly: true,
	private: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	async run(interaction, client) {
		const guild = inGuild(interaction);

		await reply(interaction, appealSettingsPanel(await readAppealSettings(client, guild), interaction.user.id));
	},
});
