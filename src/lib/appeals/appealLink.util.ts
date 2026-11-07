import { type TestifyClient } from "@core/client";
import { getAppealSettings } from "@database/repositories/appealRepository";

/** Appeals are only ever written on the dashboard, so a bot without one cannot take them. */
export function takesAppeals(client: TestifyClient): boolean {
	return client.env.DASHBOARD_ENABLED && !client.featuresOff.has("appeals");
}

/** Where a member banned from this server can appeal, or null when it takes none; added to the ban's direct message. */
export async function appealLink(client: TestifyClient, guildId: string): Promise<string | null> {
	const base = client.env.DASHBOARD_BASE_URL;
	if (!takesAppeals(client) || base === undefined) return null;

	const settings = await getAppealSettings(guildId);
	return settings?.enabled === true && settings.channelId !== null ? `${base.replace(/\/$/, "")}/appeals` : null;
}
