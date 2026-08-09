import { type ManageableGuild } from "@testify/shared";

export function filterGuilds(guilds: ManageableGuild[], search: string): ManageableGuild[] {
	const term = search.trim().toLowerCase();
	return term === "" ? guilds : guilds.filter((guild) => guild.name.toLowerCase().includes(term));
}

/**
 * Whether the search box should take focus on load.
 *
 * Autofocus costs a phone user the keyboard over the list they came to read, and a screen-reader user the page
 * heading. It only pays back on a list long enough that typing beats scrolling, which most self-hosted
 * installs never reach.
 */
export function searchIsWorthFocusing(count: number): boolean {
	return count >= 8;
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

/** Three states: the bot is in it, you could invite it, or you could not. Empty groups are dropped. */
export function groupGuilds(guilds: ManageableGuild[]): GuildGroup[] {
	return GROUPS.map(({ holds, ...group }) => ({ ...group, guilds: guilds.filter(holds) })).filter(
		(group) => group.guilds.length > 0,
	);
}
