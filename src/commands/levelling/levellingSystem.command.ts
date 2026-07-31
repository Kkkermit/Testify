import { PermissionFlagsBits } from "discord.js";
import { type CommandInput, defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { deleteLevelSettings, getLevelSettings } from "@database/repositories/levelRepository";
import { successEmbed } from "@lib/embeds.util";
import { normaliseSettings } from "@lib/levelling.util";
import { levelPanel, type LevelTab } from "@lib/levelPanel.util";
import { reply } from "@lib/reply.util";

/** One panel, opened on whichever tab was asked for. */
async function openPanel(interaction: CommandInput, tab: LevelTab): Promise<void> {
	const guild = inGuild(interaction);
	const config = normaliseSettings(await getLevelSettings(guild.id));

	await reply(interaction, levelPanel({ tab, config }, interaction.user.id));
}

export default defineCommand({
	name: "levelling",
	description: "Configures the levelling system.",
	category: "levelling",
	aliases: ["levels"],
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "setup",
			description: "Open the levelling panel and switch it on.",
			async run(interaction) {
				await openPanel(interaction, "overview");
			},
		},
		{
			name: "edit",
			description: "Change the levelling configuration.",
			async run(interaction) {
				await openPanel(interaction, "overview");
			},
		},
		{
			name: "boosts",
			description: "Choose which roles earn bonus XP.",
			async run(interaction) {
				await openPanel(interaction, "boosts");
			},
		},
		{
			name: "rewards",
			description: "Choose which roles are handed out at which level.",
			async run(interaction) {
				await openPanel(interaction, "rewards");
			},
		},
		{
			name: "ignored",
			description: "Choose channels and roles that earn no XP.",
			async run(interaction) {
				await openPanel(interaction, "ignores");
			},
		},
		{
			name: "reset",
			description: "Remove the levelling configuration. Earned XP is kept.",
			async run(interaction) {
				const guild = inGuild(interaction);
				const removed = await deleteLevelSettings(guild.id);
				if (!removed) throw new UserFacingError("Levelling is not configured here.");

				await reply(interaction, {
					embeds: [successEmbed("Levelling configuration removed. Everyone keeps the XP they earned.")],
				});
			},
		},
	],

	async run(interaction) {
		await openPanel(interaction, "overview");
	},
});
