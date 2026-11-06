// Docker's HEALTHCHECK: exits 0 while the bot's own health route says it is connected, and 1 otherwise.
import { loadEnv } from "@config/env";
import { healthUrl, isHealthy } from "@lib/bot/healthProbe.util";

async function probe(): Promise<boolean> {
	const url = healthUrl(loadEnv());
	// With the website and the dashboard both off there is no listener to ask, so the process being up is all there is.
	if (url === null) return true;

	try {
		const answer = await fetch(url, { signal: AbortSignal.timeout(5_000) });
		return answer.ok && isHealthy(await answer.json());
	} catch {
		return false;
	}
}

void probe().then((healthy) => {
	process.stdout.write(healthy ? "healthy\n" : "unhealthy\n");
	process.exit(healthy ? 0 : 1);
});
