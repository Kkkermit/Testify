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

/** What a caller may see and do; the API's answer is the gate, the frontend's only a hint. */
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
