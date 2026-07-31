/** Who someone is to a guild, decided from facts the caller has already established. */
export type Access = "owner" | "manager" | "member" | "stranger";

export interface AccessInput {
	userId: string;
	ownerIds: readonly string[];
	/** Whether the bot itself is in the guild. Nothing is configurable when it is not. */
	botInGuild: boolean;
	isMember: boolean;
	hasManageGuild: boolean;
}

/**
 * The frontend uses this to decide what to show; the API uses it to decide what to serve. Hiding a control is
 * never access control, so the backend's answer is the gate and the frontend's is a hint.
 */
export function accessFor(input: AccessInput): Access {
	if (input.ownerIds.includes(input.userId)) return "owner";
	if (!input.botInGuild || !input.isMember) return "stranger";

	return input.hasManageGuild ? "manager" : "member";
}

export function canConfigureGuild(access: Access): boolean {
	return access === "owner" || access === "manager";
}

export function canUseOwnerConsole(access: Access): boolean {
	return access === "owner";
}
