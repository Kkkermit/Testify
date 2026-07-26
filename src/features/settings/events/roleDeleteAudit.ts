import { Events, type Role } from "discord.js";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { writeAuditLog } from "../services/auditLog";

export default defineEvent({
	name: Events.GuildRoleDelete,
	async execute(client: TestifyClient, role: Role) {
		await writeAuditLog(client, role.guild, {
			event: "roleDelete",
			title: "Role deleted",
			color: "Red",
			fields: [
				{ name: "Role", value: `\`${role.name}\``, inline: true },
				{ name: "Members", value: String(role.members.size), inline: true },
			],
		});
	},
});
