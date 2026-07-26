import { ECONOMY_COOLDOWNS, type EconomyCooldownKey } from "../../config/constants";
import { defineCommand, inGuild } from "../../core/command";
import { type EconomyAccount } from "../../database/models/economy";
import { requireAccount } from "../../database/repositories/economyRepository";
import { embed } from "../../lib/embeds";
import { formatDuration } from "../../lib/format";
import { reply } from "../../lib/reply";

const TRACKED: {
	key: EconomyCooldownKey;
	label: string;
	emoji: string;
	field: keyof EconomyAccount;
	command: string;
}[] = [
	{ key: "daily", label: "Daily reward", emoji: "\u{1f4c5}", field: "lastDaily", command: "/daily" },
	{ key: "work", label: "Work", emoji: "\u{1f4bc}", field: "lastWorked", command: "/work" },
	{ key: "rob", label: "Rob", emoji: "\u{1f978}", field: "lastRobbed", command: "/rob" },
	{ key: "heist", label: "Heist", emoji: "\u{1f3ad}", field: "lastHeist", command: "/heist" },
	{ key: "beg", label: "Beg", emoji: "\u{1f450}", field: "lastBegged", command: "/beg" },
];

export default defineCommand({
	name: "cooldowns",
	description: "Shows your active economy cooldowns.",
	category: "economy",
	guildOnly: true,

	async run(interaction) {
		const guild = inGuild(interaction);
		const account = await requireAccount(guild.id, interaction.user.id);
		const now = Date.now();

		const fields = TRACKED.map((entry) => {
			const last = account[entry.field];
			const readyAt = last instanceof Date ? last.getTime() + ECONOMY_COOLDOWNS[entry.key] : 0;
			const remaining = readyAt - now;

			return {
				name: `${entry.emoji} ${entry.label}`,
				value:
					remaining > 0
						? `\u23f3 ${formatDuration(remaining)}\n\`${entry.command}\``
						: `\u2705 Ready\n\`${entry.command}\``,
				inline: true,
			};
		});

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
					title: "Your cooldowns",
					description: "When each economy command is next available.",
					fields,
				}),
			],
		});
	},
});
