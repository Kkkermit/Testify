import { type Guild, type GuildMember } from "discord.js";
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
