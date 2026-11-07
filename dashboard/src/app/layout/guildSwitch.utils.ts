import { type ManageableGuild } from "@testify/shared";
import { mayOpen } from "@/config/navigation";

const KEPT_PARAMS = ["tab"] as const;

export function switchedPath(
	location: { pathname: string; search: string },
	{ id: guildId, areas }: Pick<ManageableGuild, "id" | "areas">,
): string {
	const [, root, , screen] = location.pathname.split("/");
	const path =
		root === "guilds" && screen !== undefined && screen !== "" ? `/guilds/${guildId}/${screen}` : `/guilds/${guildId}`;
	// A screen the other server does not open to this reader would only refuse them, so they land on its overview.
	if (!mayOpen(path, guildId, areas)) return `/guilds/${guildId}`;

	const current = new URLSearchParams(location.search);
	const kept = new URLSearchParams();
	for (const key of KEPT_PARAMS) {
		const value = current.get(key);
		if (value !== null) kept.set(key, value);
	}

	const query = kept.toString();
	return query === "" ? path : `${path}?${query}`;
}

export function switchableGuilds(guilds: readonly ManageableGuild[], currentId: string): ManageableGuild[] {
	return guilds.filter((guild) => guild.botPresent && guild.id !== currentId);
}
