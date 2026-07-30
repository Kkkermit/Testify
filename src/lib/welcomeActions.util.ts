import { type AttachmentBuilder, type EmbedBuilder, type GuildMember } from "discord.js";
import { type WelcomeSettings } from "@database/models/guildSettings.schema";
import { embed } from "@lib/embeds.util";
import { fillTemplate, type WelcomeConfig } from "@lib/welcome.util";
import { renderWelcomeCard } from "@lib/welcomeCard.util";

/**
 * Builds the greeting, once, for every surface that sends one: the join event, the
 * panel's Preview button and `/welcome test`.
 *
 * Sharing it is the point — a preview rendered by different code than the real
 * greeting is a preview that can lie.
 */

export interface Greeting {
	content?: string;
	embeds?: EmbedBuilder[];
	files?: AttachmentBuilder[];
	allowedMentions: { users: string[] };
}

export async function greetingFor(
	member: GuildMember,
	config: WelcomeConfig,
	settings: Pick<WelcomeSettings, "background"> | null,
): Promise<Greeting> {
	const message = fillTemplate(config.message, {
		mention: `<@${member.id}>`,
		username: member.user.username,
		serverName: member.guild.name,
		memberCount: member.guild.memberCount,
	});

	// Only the member being greeted is ever pinged, whatever the template says.
	const allowedMentions = { users: [member.id] };

	if (config.style === "text") return { content: message, allowedMentions };

	if (config.style === "embed") {
		return {
			embeds: [
				embed({
					category: "community",
					title: `Welcome to ${member.guild.name}`,
					description: message,
					thumbnail: member.user.displayAvatarURL({ size: 256 }),
				}),
			],
			content: `<@${member.id}>`,
			allowedMentions,
		};
	}

	const card = await renderWelcomeCard({
		displayName: member.displayName,
		avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
		serverName: member.guild.name,
		memberCount: member.guild.memberCount,
		background: settings?.background?.data ?? null,
	});

	return { content: message, files: [card], allowedMentions };
}
