import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import { RAID_COMMAND, raidPanel, readRaidOverview } from "@lib/raid";

/** Holds back accounts younger than a server allows, and tells staff when joins spike. */
export default defineCommand({
	name: RAID_COMMAND,
	description: "Holds back brand new accounts and alerts staff when joins spike.",
	category: "settings",
	private: true,
	aliases: ["raid", "anti-raid"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ModerateMembers],

	async run(interaction) {
		await reply(interaction, raidPanel(await readRaidOverview(inGuild(interaction)), interaction.user.id));
	},
});
