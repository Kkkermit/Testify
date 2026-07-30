import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getLevelSettings, getRank, getUserLevel } from "@database/repositories/levelRepository";
import { multiplierFor, normaliseSettings, progressOf } from "@lib/levelling.util";
import { renderRankCard } from "@lib/rankCard.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "rank",
	description: "Shows your level and rank in this server.",
	category: "levelling",
	aliases: ["level", "xp"],
	guildOnly: true,
	options: [{ name: "user", description: "Whose rank to check. Defaults to you.", type: "user" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user") ?? interaction.user;

		const record = await getUserLevel(guild.id, target.id);
		if (!record) throw new UserFacingError(`${target.username} has not earned any XP here yet.`);

		// Drawing the card and fetching the avatar together take longer than the three
		// seconds Discord allows before the interaction expires.
		await interaction.deferReply();

		const [rank, settings, member] = await Promise.all([
			getRank(guild.id, target.id),
			getLevelSettings(guild.id),
			guild.members.fetch(target.id).catch(() => null),
		]);

		const config = normaliseSettings(settings);
		const progress = progressOf(record.xp, record.level);

		const card = await renderRankCard({
			displayName: member?.displayName ?? target.displayName,
			avatarUrl: (member ?? target).displayAvatarURL({ extension: "png", size: 256 }),
			level: record.level,
			rank,
			xp: record.xp,
			progress: progress.progress,
			needed: progress.needed,
			multiplier: member === null ? 1 : multiplierFor(config, [...member.roles.cache.keys()]),
		});

		await reply(interaction, { files: [card] });
	},
});
