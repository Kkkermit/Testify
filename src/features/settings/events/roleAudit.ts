import { Events, type Role } from "discord.js";
import { type TestifyClient } from "../../../core/client";
import { defineEvent } from "../../../core/event";
import { writeAuditLog } from "../services/auditLog";

export default defineEvent({
	name: Events.GuildRoleCreate,
	async execute(client: TestifyClient, role: Role) {
		await writeAuditLog(client, role.guild, {
			event: "roleCreate",
			title: "Role created",
			color: "Green",
			fields: [
				{ name: "Role", value: `${role} (\`${role.name}\`)`, inline: true },
				{ name: "Colour", value: role.hexColor, inline: true },
			],
		});
	},
});
