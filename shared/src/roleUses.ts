/** Every place the bot gives a role or reads one, so a manager can tell what deleting a role would stop. */

export type RoleUse =
	| { kind: "levelReward"; level: number }
	| { kind: "levelBoost"; multiplier: number }
	| { kind: "levelIgnored" }
	| { kind: "joinRole" }
	| { kind: "roleMenu"; menuId: string; title: string }
	| { kind: "dj" }
	| { kind: "ticketStaff" }
	| { kind: "raidPing" }
	| { kind: "verified" };

export type RoleUseKind = RoleUse["kind"];

export interface GuildRoleUses {
	/** Keyed by role id, including a role the server has since deleted that a setting still names. */
	uses: Record<string, RoleUse[]>;
}
