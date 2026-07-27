import { getServers } from "node:dns";
import mongoose from "mongoose";
import { SetupError, toError } from "@core/errors";
import { type Logger } from "@core/logger";

/** The only place a Mongo connection is opened. */

export interface ConnectOptions {
	uri: string;
	logger: Logger;
	retries?: number;
	retryDelayMs?: number;
}

let everConnected = false;

/**
 * Turns the driver's failure into something you can act on. Nearly every
 * first-run problem is one of these three, and the stack trace says none of it.
 */
export function explainConnectionFailure(error: unknown, uri: string): string {
	const { code, message } = error as { code?: string; message?: string };
	const text = message ?? String(error);

	if (code === "ECONNREFUSED" && text.includes("querySrv")) {
		const servers = getServers();

		return [
			"Node could not look up the database's address.",
			"",
			"A `mongodb+srv://` string needs a DNS SRV lookup. Node does those with its",
			"own resolver rather than the operating system's, and it could not reach the",
			"servers it was told to use:",
			"",
			`  ${servers.join(", ")}`,
			"",
			"This is why `nslookup` can work while the bot still fails — they do not ask",
			"the same resolver. An address starting `fe80::` above is the usual cause:",
			"that is your router advertised over IPv6, and Node's resolver cannot use it.",
			"",
			"Either of these fixes it:",
			"  1. Set real DNS servers — 1.1.1.1 and 8.8.8.8.",
			"     macOS: System Settings → Network → your connection → Details → DNS.",
			"     Then check `cat /etc/resolv.conf` shows them.",
			"  2. Use a connection string with no SRV lookup in it. In Atlas:",
			"     Connect → Drivers → Node.js 2.2.12 or earlier. It starts `mongodb://`",
			"     and names the hosts directly.",
			"",
			`  Confirm the diagnosis with:  nslookup -type=SRV ${srvHostOf(uri)}`,
			"  If that works but this does not, it is definitely the resolver above.",
		].join("\n");
	}

	if (code === "ENOTFOUND" || code === "ENODATA") {
		return [
			"That database hostname does not exist.",
			"",
			"Check MONGODB_URI for a typo, and that the cluster has not been deleted.",
			"A paused Atlas cluster also looks like this — resume it from the Atlas dashboard.",
		].join("\n");
	}

	if (text.includes("Authentication failed") || text.includes("bad auth")) {
		return [
			"The database rejected your username or password.",
			"",
			"Check them in Atlas under Database Access. If the password contains any of",
			"@ : / ? # [ ] then it has to be percent-encoded in the connection string.",
		].join("\n");
	}

	if (text.includes("timed out") || text.includes("ServerSelection")) {
		return [
			"The database did not answer in time.",
			"",
			"The usual cause is that your IP address is not allowed. In Atlas go to",
			"Network Access and add your current IP, or 0.0.0.0/0 while you are testing.",
		].join("\n");
	}

	return `Could not connect to MongoDB: ${text}`;
}

function srvHostOf(uri: string): string {
	const host = /^mongodb\+srv:\/\/(?:[^@]*@)?([^/?]+)/.exec(uri)?.[1];
	return host === undefined ? "your-cluster-host" : `_mongodb._tcp.${host}`;
}

export async function connectDatabase(options: ConnectOptions): Promise<typeof mongoose> {
	const retries = options.retries ?? 5;
	const retryDelayMs = options.retryDelayMs ?? 2_000;

	mongoose.set("strictQuery", true);

	mongoose.connection.on("disconnected", () => {
		// Only worth saying once we have had a connection to lose.
		if (everConnected) options.logger.warn("Lost connection to MongoDB");
	});
	mongoose.connection.on("reconnected", () => {
		options.logger.info("Reconnected to MongoDB");
	});
	mongoose.connection.on("error", (error: unknown) => {
		// While connecting, the retry loop below reports the failure; logging the
		// same error from here as well is what made one problem look like four.
		if (everConnected) options.logger.error({ err: toError(error) }, "MongoDB connection error");
	});

	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			await mongoose.connect(options.uri, { serverSelectionTimeoutMS: 10_000 });
			everConnected = true;
			options.logger.debug({ database: mongoose.connection.name }, "Connected to MongoDB");
			return mongoose;
		} catch (error) {
			if (attempt === retries) throw new SetupError(explainConnectionFailure(error, options.uri));

			options.logger.warn({ attempt, of: retries }, "Cannot reach MongoDB yet, retrying");
			await new Promise((done) => setTimeout(done, retryDelayMs * attempt));
		}
	}

	throw new Error("unreachable");
}

export async function disconnectDatabase(): Promise<void> {
	if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) return;
	await mongoose.disconnect();
}
