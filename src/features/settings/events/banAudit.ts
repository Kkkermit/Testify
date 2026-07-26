import { Events, type GuildBan } from "discord.js";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { writeAuditLog } from "../services/auditLog";

export default defineEvent({
	name: Events.GuildBanAdd,
	async execute(client: TestifyClient, ban: GuildBan) {
		await writeAuditLog(client, ban.guild, {
			event: "banAdd",
			title: "Member banned",
			color: "DarkRed",
			fields: [
				{ name: "User", value: `${ban.user} (\`${ban.user.id}\`)`, inline: true },
				{ name: "Reason", value: ban.reason ?? "No reason recorded" },
			],
			thumbnail: ban.user.displayAvatarURL(),
		});
	},
});
