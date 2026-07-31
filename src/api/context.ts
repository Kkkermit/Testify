import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { type DashboardSession } from "@database/models/dashboardSession.schema";

/** What every route can reach. Middleware adds to this as it authorises a request. */
export interface ApiBindings {
	Variables: {
		client: TestifyClient;
		env: Env;
		/** Set by the session middleware once one is proven. Absent means the caller is not signed in. */
		session?: DashboardSession;
	};
}
