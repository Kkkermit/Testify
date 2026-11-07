import { type Env } from "@config/env";
import { TestifyClient } from "@core/client";
import { createLogger } from "@core/logger";

/** Discord refuses an unsharded bot once it is in 2,500 servers, so the client asks how many shards to run. */
it("asks Discord how many shards to run", async () => {
	const client = new TestifyClient(
		{ DISCORD_OWNER_IDS: [], DISABLED_FEATURES: [] } as unknown as Env,
		createLogger("fatal", false),
	);

	expect(client.options.shards).toBe("auto");
	await client.destroy();
});
