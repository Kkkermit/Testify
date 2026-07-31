import { type ManageableGuild } from "@testify/shared";

export function filterGuilds(guilds: ManageableGuild[], search: string): ManageableGuild[] {
	const term = search.trim().toLowerCase();
	return term === "" ? guilds : guilds.filter((guild) => guild.name.toLowerCase().includes(term));
}
