import { PermissionsBitField } from "discord.js";
import { defineMessageHandler } from "../../core/message";
import { addWarning } from "../../database/repositories/moderationRepository";
import { getAntiLink } from "../../database/repositories/settingsRepository";
import { embed } from "../../lib/embeds";

const LINK_PATTERN = /(https?:\/\/|www\.|discord\.gg\/|\b[a-z0-9-]+\.(com|net|org|io|gg|xyz|co)\b)/i;

export default defineMessageHandler({
	name: "antiLink",
	order: 25,
	async run(message, client) {
		if (!message.guild || !message.member) return;
		if (!LINK_PATTERN.test(message.content)) return;

		const settings = await getAntiLink(message.guild.id);
		if (!settings) return;

		const bypass = Object.hasOwn(PermissionsBitField.Flags, settings.bypassPermission)
			? PermissionsBitField.Flags[settings.bypassPermission as keyof typeof PermissionsBitField.Flags]
			: null;
		if (bypass !== null && message.member.permissions.has(bypass)) return;

		await message.delete().catch(() => null);

		// The warning is attributed to the bot rather than a hardcoded user ID and
		// tag from the original author's account.
		await addWarning(
			message.guild.id,
			message.author.id,
			message.author.username,
			{ id: client.user?.id ?? "0", tag: client.user?.username ?? "Testify" },
			"Posted a forbidden link",
		);

		if (!message.channel.isSendable()) return true;

		const notice = await message.channel.send({
			embeds: [
				embed({
					category: "moderation",
					title: "Link removed",
					description: `${message.author}, links are not allowed in **${message.guild.name}**.`,
				}),
			],
		});

		client.timers.after(`antilink:${notice.id}`, 5_000, async () => {
			await notice.delete().catch(() => null);
		});

		return true;
	},
});
