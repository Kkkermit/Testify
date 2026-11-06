import { type AccessArea } from "@testify/shared";

/** A screen's routes: its path and everything under it but a `.` or `..` segment, each asking its own permission. */
const under = (...names: string[]): RegExp => new RegExp(`^/(?:${names.join("|")})(?:/(?!\\.\\.?(?:/|$))[^/]+)*$`);

/** The routes each screen calls, as paths under `/api/guilds/:guildId`, where a grant stands in for Manage Server. */
const AREA_ROUTES: Record<AccessArea, readonly { methods?: readonly string[]; path: RegExp }[]> = {
	members: [{ path: under("members") }],
	channels: [{ methods: ["GET"], path: under("places") }],
	roles: [{ methods: ["GET"], path: under("role-uses") }],
	settings: [{ path: under("settings", "verification") }],
	commands: [{ path: under("commands") }],
	welcome: [{ path: under("welcome", "goodbye") }],
	birthdays: [{ path: under("birthdays") }],
	levelling: [{ path: under("levelling", "tuning") }],
	"role-menus": [{ path: under("role-menus") }],
	ideas: [{ path: under("ideas") }],
	starboard: [{ path: under("starboard") }],
	"temp-voice": [{ path: under("temp-voice") }],
	announcements: [{ path: under("announcements") }],
	"scheduled-messages": [{ path: under("scheduled-messages") }],
	sticky: [{ path: under("sticky") }],
	"auto-responders": [{ path: under("auto-responders") }],
	automod: [{ path: under("automod") }],
	"raid-protection": [{ path: under("raid-protection") }],
	// Warning somebody starts by finding them, which is the member search.
	warnings: [{ path: under("warnings") }, { methods: ["GET"], path: /^\/members\/search$/ }],
	cases: [{ path: under("cases") }],
	bans: [{ path: under("bans") }],
	appeals: [{ path: under("appeals") }],
	modmail: [{ path: under("modmail") }],
	"channel-tools": [{ path: under("channel-tools") }],
	tickets: [{ path: under("tickets") }],
	"audit-log": [{ path: under("audit-log") }],
	changes: [{ methods: ["GET"], path: under("changes", "audit") }],
	insights: [{ methods: ["GET"], path: under("insights") }],
	invites: [{ path: under("invites") }],
	"member-count": [{ path: under("member-count") }],
	"bot-stats": [{ path: under("bot-stats") }],
	economy: [{ path: under("tuning", "shop-roles") }],
	treasure: [{ path: under("treasure") }],
	lottery: [{ path: under("lottery") }],
	casino: [{ path: under("casino") }],
	music: [{ path: under("music") }],
	giveaways: [{ path: under("giveaways") }],
};

/** What every screen draws from, so anybody given any screen may read it. */
const SHARED: readonly { methods?: readonly string[]; path: RegExp }[] = [
	{ methods: ["GET"], path: /^\/(?:overview|channels|roles)$/ },
	// Send me a test only ever messages the person asking; the route checks the kind against their screens.
	{ methods: ["POST"], path: /^\/test-post$/ },
];

/** Whether a person given `areas` may make this request; everything not listed stays closed to them. */
export function accessOpens(areas: readonly AccessArea[], method: string, path: string, guildId: string): boolean {
	const at = path.indexOf(`/guilds/${guildId}/`);
	if (at === -1) return false;

	const rest = path.slice(at + `/guilds/${guildId}`.length);
	return [...SHARED, ...areas.flatMap((area) => AREA_ROUTES[area])].some(
		(route) => (route.methods ?? [method]).includes(method) && route.path.test(rest),
	);
}
