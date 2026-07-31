import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";

/** What every route can reach. Middleware adds to this as it authorises a request. */
export interface ApiBindings {
	Variables: {
		client: TestifyClient;
		env: Env;
	};
}
