import { type ManageableGuild } from "@testify/shared";

export function filterGuilds(guilds: ManageableGuild[], search: string): ManageableGuild[] {
	const term = search.trim().toLowerCase();
	return term === "" ? guilds : guilds.filter((guild) => guild.name.toLowerCase().includes(term));
}

export type GuildGroupKey = "configurable" | "invitable" | "locked";

export interface GuildGroup {
	key: GuildGroupKey;
	title: string;
	describes: string;
	guilds: ManageableGuild[];
}

const GROUPS: { key: GuildGroupKey; title: string; describes: string; holds: (guild: ManageableGuild) => boolean }[] = [
	{
		key: "configurable",
		title: "Ready to configure",
		describes: "Testify is in these, so every setting is one click away.",
		holds: (guild) => guild.botPresent,
	},
	{
		key: "invitable",
		title: "Add Testify",
		describes: "You have Manage Server here, so you can invite Testify yourself.",
		holds: (guild) => !guild.botPresent && guild.canInvite,
	},
	{
		key: "locked",
		title: "Needs somebody else",
		describes: "Adding a bot takes Manage Server, which you do not have in these.",
		holds: (guild) => !guild.botPresent && !guild.canInvite,
	},
];

/**
 * Three states, not two: a server the bot is in, one you could invite it to, and one you could not. Sorting the
 * first to the top left the last two looking identical while only one of them had a button that would work.
 * Empty groups are dropped rather than rendered as a heading over nothing.
 */
export function groupGuilds(guilds: ManageableGuild[]): GuildGroup[] {
	return GROUPS.map(({ holds, ...group }) => ({ ...group, guilds: guilds.filter(holds) })).filter(
		(group) => group.guilds.length > 0,
	);
}
