import { type Guild, type GuildMember } from "discord.js";
import { type Context } from "hono";
import { notInGuild } from "@api/errors";
import { type OauthConfig } from "@api/oauth";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type DashboardSession } from "@database/models/dashboardSession.schema";

/** What every route can reach. Middleware adds to this as it authorises a request. */
export interface ApiBindings {
	Variables: {
		client: TestifyClient;
		env: Env;
		/** Null while the install is unfinished, which is a setup screen rather than an error. */
		oauth: OauthConfig | null;
		/** Set by the session middleware once one is proven. Absent means the caller is not signed in. */
		session?: DashboardSession;
		/** Set by `requireGuild`, and the only guild a handler may act on. */
		guild?: Guild;
		/** Absent for a bot owner, who is not necessarily in the guild at all. */
		member?: GuildMember;
		isOwner?: boolean;
	};
}

/** The guild `requireGuild` authorised, and the only one a handler may act on; without it the route is miswired. */
export function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notInGuild();

	return guild;
}

export function guildIdOf(context: Context<ApiBindings>): string {
	return guildOf(context).id;
}

/** The person acting, as a moderation record names them; `requireGuild` has already insisted on a session. */
export function actorOf(context: Context<ApiBindings>): { id: string; name: string } {
	const session = context.get("session");
	return { id: session?.userId ?? "", name: session?.username ?? "a server manager" };
}
