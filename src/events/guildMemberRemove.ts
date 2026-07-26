import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { type TestifyClient } from "../core/client";
import { defineEvent } from "../core/event";
import { writeAuditLog } from "../lib/auditLog";
import { syncVoiceCounters } from "../lib/voiceCounters";

export default defineEvent({
	name: Events.GuildMemberRemove,
	async run(client: TestifyClient, member: GuildMember | PartialGuildMember) {
		await writeAuditLog(client, member.guild, {
			event: "memberLeave",
			title: "Member left",
			colour: "Orange",
			fields: [
				{ name: "Member", value: `${member.user.username} (\`${member.id}\`)`, inline: true },
				{ name: "Member count", value: String(member.guild.memberCount), inline: true },
			],
			thumbnail: member.user.displayAvatarURL(),
		});

		await syncVoiceCounters(client, member.guild);
	},
});
