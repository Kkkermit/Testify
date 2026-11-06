import { type GuildMember, PermissionFlagsBits } from "discord.js";
import { MODERATOR_PERMISSIONS } from "@testify/shared";

/** What a moderator without Manage Server may reach under `/api/guilds/:guildId`; each route still asks its own. */
const OPEN: readonly { methods: readonly string[]; path: RegExp }[] = [
	{ methods: ["GET"], path: /^\/(?:overview|channels|roles|cases|bans|appeals|warnings)$/ },
	{ methods: ["GET"], path: /^\/members(?:\/[^/]+(?:\/roles)?)?$/ },
	{ methods: ["POST"], path: /^\/members\/(?:bulk\/(?:roles|timeout|kick|ban)|[^/]+\/(?:kick|ban|timeout))$/ },
	{ methods: ["PATCH"], path: /^\/members\/[^/]+\/(?:level|money|nickname)$/ },
	{ methods: ["PUT"], path: /^\/members\/[^/]+\/roles$/ },
	{ methods: ["DELETE"], path: /^\/members\/[^/]+\/(?:softban|timeout)$/ },
	{ methods: ["POST"], path: /^\/warnings$/ },
	{ methods: ["PATCH", "DELETE"], path: /^\/warnings\/\d{17,20}\/[^/]+$/ },
	{ methods: ["DELETE"], path: /^\/warnings\/\d{17,20}$/ },
	{ methods: ["POST"], path: /^\/bans\/[^/]+\/unban$/ },
	{ methods: ["POST"], path: /^\/appeals\/[^/]+\/decision$/ },
];

export function openToModerators(method: string, path: string, guildId: string): boolean {
	const at = path.indexOf(`/guilds/${guildId}/`);
	if (at === -1) return false;

	const rest = path.slice(at + `/guilds/${guildId}`.length);
	return OPEN.some((route) => route.methods.includes(method) && route.path.test(rest));
}

export function moderates(member: GuildMember): boolean {
	return MODERATOR_PERMISSIONS.some((name) => member.permissions.has(PermissionFlagsBits[name]));
}
