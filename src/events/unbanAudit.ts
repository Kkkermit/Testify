import { Events, type GuildBan } from "discord.js";
import { type TestifyClient } from "../core/client";
import { defineEvent } from "../core/event";
import { writeAuditLog } from "../lib/auditLog";

export default defineEvent({
	name: Events.GuildBanRemove,
	async run(client: TestifyClient, ban: GuildBan) {
		await writeAuditLog(client, ban.guild, {
			event: "banRemove",
			title: "Member unbanned",
			colour: "Green",
			fields: [{ name: "User", value: `${ban.user} (\`${ban.user.id}\`)`, inline: true }],
			thumbnail: ban.user.displayAvatarURL(),
		});
	},
});
