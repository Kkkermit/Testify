import { type TestifyClient } from "@core/client";
import { recordStatusSample } from "@database/repositories/statusRepository";
import { liveStatus, resetEventLoopDelay } from "@lib/bot";
import { musicBinaries } from "@lib/music";

/** Writes one heartbeat, so the status page can show when the bot was up and, by the gaps, when it was not. */
export async function recordHeartbeat(client: TestifyClient): Promise<void> {
	const status = await liveStatus(client, { binaries: musicBinaries(client) });
	resetEventLoopDelay();

	if (status.database.level === "down") return;

	await recordStatusSample({
		at: new Date(status.checkedAt),
		level: status.level,
		gatewayPingMs: status.gateway.pingMs,
		databasePingMs: status.database.pingMs,
		eventLoopP99Ms: status.eventLoop.p99Ms,
	});
}
