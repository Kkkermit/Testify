import { Events, type GuildMember } from "discord.js";
import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import { defineEvent } from "@core/event";
import { getAutoRoles, getWelcome } from "@database/repositories/settingsRepository";
import { writeAuditLog } from "@lib/auditLog.util";
import { syncVoiceCounters } from "@lib/voiceCounters.util";
import { normaliseWelcome } from "@lib/welcome.util";
import { greetingFor } from "@lib/welcomeActions.util";

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

		const settings = await getWelcome(member.guild.id);
		const welcome = normaliseWelcome(settings);

		if (welcome !== null) {
			const channel = await client.channels.fetch(welcome.channelId).catch(() => null);

			if (channel?.isTextBased() === true && channel.isSendable()) {
				// The same builder `/welcome test` and the panel's Preview use, so what an
				// admin checks is exactly what a member gets.
				const greeting = await greetingFor(member, welcome, settings).catch((error: unknown) => {
					client.logger.warn(
						{ err: toError(error), guildId: member.guild.id },
						"[WELCOME] Could not build the greeting",
					);
					return null;
				});

				if (greeting !== null) await channel.send(greeting);
			}
		}

		await syncVoiceCounters(client, member.guild);
	},
});
