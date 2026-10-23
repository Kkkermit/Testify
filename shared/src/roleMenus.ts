import { z } from "zod";
import { type Problem, problem } from "./problems";
import { snowflake } from "./schemas";
import { plainLine, plainText } from "./text";

export const ROLE_MENU_LIMITS = {
	/** Each menu is a message the bot keeps up to date, and a server rarely needs more. */
	maxPerGuild: 10,
	/** Discord's cap on the options in one select menu. */
	maxRoles: 25,
	maxTitle: 80,
	maxDescription: 1_000,
} as const;

/** `one` lets a member hold a single role from the menu, for choices that exclude each other. */
export const ROLE_MENU_MODES = ["many", "one"] as const;

export type RoleMenuMode = (typeof ROLE_MENU_MODES)[number];

export interface RoleMenuEntry {
	id: string;
	channelId: string;
	title: string;
	description: string;
	roleIds: string[];
	mode: RoleMenuMode;
	posted: boolean;
	/** False when the bot cannot post in the channel, so a menu that will never appear says so. */
	canSend: boolean;
}

export interface RoleMenuList {
	menus: RoleMenuEntry[];
	limit: number;
}

export const roleMenuBody = z.object({
	channelId: snowflake,
	title: plainLine(1, ROLE_MENU_LIMITS.maxTitle),
	description: plainText(0, ROLE_MENU_LIMITS.maxDescription),
	roleIds: z
		.array(snowflake)
		.min(1, "needs at least one role")
		.max(ROLE_MENU_LIMITS.maxRoles, `at most ${String(ROLE_MENU_LIMITS.maxRoles)} roles`),
	mode: z.enum(ROLE_MENU_MODES),
});

export type RoleMenuBody = z.infer<typeof roleMenuBody>;

/** A menu's database id, which is what the list hands back. */
export const roleMenuParams = z.object({ menuId: z.string().regex(/^[a-f\d]{24}$/, "must be a menu id") });

/** Why a menu cannot be saved, in the words each surface shows — the same rules the API enforces. */
export function roleMenuBlocked(draft: {
	channelId: string | null;
	title: string;
	roleIds: readonly string[];
}): Problem | null {
	if (draft.channelId === null) return problem("roleMenu.channel");
	if (draft.title.trim() === "") return problem("roleMenu.title");
	if (draft.roleIds.length === 0) return problem("roleMenu.roles");
	if (draft.roleIds.length > ROLE_MENU_LIMITS.maxRoles) {
		return problem("roleMenu.tooManyRoles", { max: ROLE_MENU_LIMITS.maxRoles });
	}

	return null;
}
