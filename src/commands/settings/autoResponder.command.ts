import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { AUTO_RESPONDER_COMMAND, autoResponderHub, readAutoResponders } from "@lib/autoResponders";
import { reply } from "@lib/discord";

/** A server's own trigger words and the replies they get, made and changed from one panel. */
export default defineCommand({
	name: AUTO_RESPONDER_COMMAND,
	description: "Words the bot answers with a reply you write.",
	category: "settings",
	private: true,
	aliases: ["autoresponder", "auto-reply", "autoreply"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],

	async run(interaction) {
		const guild = inGuild(interaction);

		await reply(interaction, autoResponderHub((await readAutoResponders(guild.id)).responders, interaction.user.id));
	},
});
