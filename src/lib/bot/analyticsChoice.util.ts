import { type TestifyClient } from "@core/client";
import { isOptedOut, saveOptOut } from "@database/repositories/analyticsOptOutRepository";

/** What the usage analytics do with one person right now; `off` while the bot sends them nowhere. */
export interface AnalyticsChoice {
	optedOut: boolean;
	sending: "off" | "identified" | "hashed";
}

export async function analyticsChoice(client: TestifyClient, userId: string): Promise<AnalyticsChoice> {
	const lens = client.shardlens;
	const optedOut = await isOptedOut(userId);
	if (lens === null) return { optedOut, sending: "off" };
	// Audit mode takes effect only once the collector agrees, and until then everybody is hashed.
	return { optedOut, sending: lens.stats().mode === "audit" ? "identified" : "hashed" };
}

/** Stored before the SDK hears it, so a choice that cannot be kept is never shown as made. */
export async function chooseAnalytics(client: TestifyClient, userId: string, optedOut: boolean): Promise<void> {
	await saveOptOut(userId, optedOut);
	if (optedOut) client.shardlens?.optOut(userId);
	else client.shardlens?.optIn(userId);
}

/** Opts them out and asks the collector to delete what it holds; `failed` means only the opt-out stuck. */
export async function eraseAnalytics(client: TestifyClient, userId: string): Promise<"erased" | "failed" | "off"> {
	await chooseAnalytics(client, userId, true);
	const lens = client.shardlens;
	if (lens === null) return "off";
	return (await lens.forgetUser(userId)) === undefined ? "failed" : "erased";
}
