import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { type TestifyClient } from "@core/client";
import { defineEvent } from "@core/event";
import { countMove } from "@lib/info";
import { writeAuditLog } from "@lib/moderation";
import { syncVoiceCounters } from "@lib/settings";

export default defineEvent({
	name: Events.GuildMemberRemove,
	async run(client: TestifyClient, member: GuildMember | PartialGuildMember) {
		countMove(client, member, "leave");

		await writeAuditLog(client, member.guild, {
			event: "memberLeave",
			title: "Member left",
			tone: "left",
			fields: [
				{ name: "Member", value: `${member.user.username} (\`${member.id}\`)`, inline: true },
				{ name: "Member count", value: String(member.guild.memberCount), inline: true },
			],
			thumbnail: member.user.displayAvatarURL(),
		});

		await syncVoiceCounters(client, member.guild);
	},
});
