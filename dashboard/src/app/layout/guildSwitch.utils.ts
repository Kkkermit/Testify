import { type ManageableGuild } from "@testify/shared";

/** Only the tab survives a switch: a search or a member id belongs to the server it was typed in. */
const KEPT_PARAMS = ["tab"] as const;

/** The same screen in another server: `/guilds/a/levelling/x?tab=rewards&q=y` becomes `/guilds/b/levelling?tab=rewards`. */
export function switchedPath(location: { pathname: string; search: string }, guildId: string): string {
	const [, root, , screen] = location.pathname.split("/");
	const path =
		root === "guilds" && screen !== undefined && screen !== "" ? `/guilds/${guildId}/${screen}` : `/guilds/${guildId}`;

	const current = new URLSearchParams(location.search);
	const kept = new URLSearchParams();
	for (const key of KEPT_PARAMS) {
		const value = current.get(key);
		if (value !== null) kept.set(key, value);
	}

	const query = kept.toString();
	return query === "" ? path : `${path}?${query}`;
}

/** Every other server the bot is in, in the picker's order. */
export function switchableGuilds(guilds: readonly ManageableGuild[], currentId: string): ManageableGuild[] {
	return guilds.filter((guild) => guild.botPresent && guild.id !== currentId);
}
