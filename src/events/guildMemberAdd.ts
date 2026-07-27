import { Events, type GuildMember } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { defineEvent } from "@core/event";
import { getAutoRoles, getWelcome } from "@database/repositories/settingsRepository";
import { writeAuditLog } from "@lib/auditLog";
import { embed } from "@lib/embeds";
import { syncVoiceCounters } from "@lib/voiceCounters";
import { renderWelcomeCard } from "@lib/welcomeCard";

function fillTemplate(template: string, member: GuildMember): string {
	return template
		.replaceAll("{user}", `<@${member.id}>`)
		.replaceAll("{username}", member.user.username)
		.replaceAll("{server}", member.guild.name)
		.replaceAll("{count}", String(member.guild.memberCount));
}

export default defineEvent({
	name: Events.GuildMemberAdd,
	async run(client: TestifyClient, member: GuildMember) {
		await writeAuditLog(client, member.guild, {
			event: "memberJoin",
			title: "Member joined",
			colour: "Green",
			fields: [
				{ name: "Member", value: `${member} (\`${member.id}\`)`, inline: true },
				{ name: "Member count", value: String(member.guild.memberCount), inline: true },
			],
			thumbnail: member.user.displayAvatarURL(),
		});

		const autoRoles = await getAutoRoles(member.guild.id);
		if (autoRoles && autoRoles.roleIds.length > 0) {
			// `if (data.Roles.length < 0)` in the original was never true, but the
			// roles were also added one await at a time with no error handling.
			await Promise.all(
				autoRoles.roleIds.map((roleId) =>
					member.roles.add(roleId, "Auto-role").catch((error: unknown) => {
						client.logger.warn(
							{ err: toError(error), roleId, guildId: member.guild.id },
							"Could not apply an auto-role",
						);
					}),
				),
			);
		}

		const welcome = await getWelcome(member.guild.id);
		if (welcome) {
			const channel = await client.channels.fetch(welcome.channelId).catch(() => null);
			if (channel?.isTextBased() && channel.isSendable()) {
				const message = fillTemplate(welcome.message, member);

				if (welcome.isEmbed) {
					const card = await renderWelcomeCard(member).catch(() => null);
					await channel.send({
						embeds: [
							embed({
								category: "community",
								title: `Welcome to ${member.guild.name}`,
								description: message,
								...(card !== null ? { image: "attachment://welcome.png" } : {}),
							}),
						],
						...(card !== null ? { files: [card] } : {}),
					});
				} else {
					await channel.send({ content: message, allowedMentions: { users: [member.id] } });
				}
			}
		}

		await syncVoiceCounters(client, member.guild);
	},
});
