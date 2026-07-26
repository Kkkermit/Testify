import mongoose from "mongoose";
import { toError } from "../core/errors";
import { type Logger } from "../core/logger";

/** The only place a Mongo connection is opened. */

export interface ConnectOptions {
	uri: string;
	logger: Logger;
	retries?: number;
	retryDelayMs?: number;
}

let connected = false;

export async function connectDatabase(options: ConnectOptions): Promise<typeof mongoose> {
	const retries = options.retries ?? 5;
	const retryDelayMs = options.retryDelayMs ?? 2_000;

	mongoose.set("strictQuery", true);

	mongoose.connection.on("disconnected", () => {
		connected = false;
		options.logger.warn("Lost connection to MongoDB");
	});
	mongoose.connection.on("reconnected", () => {
		connected = true;
		options.logger.info("Reconnected to MongoDB");
	});
	mongoose.connection.on("error", (error: unknown) => {
		options.logger.error({ err: toError(error) }, "MongoDB connection error");
	});

	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			await mongoose.connect(options.uri, { serverSelectionTimeoutMS: 10_000 });
			connected = true;
			options.logger.info({ database: mongoose.connection.name }, "Connected to MongoDB");
			return mongoose;
		} catch (error) {
			const isLast = attempt === retries;
			options.logger.error(
				{ err: toError(error), attempt, retries },
				isLast ? "Could not connect to MongoDB" : "MongoDB connection attempt failed, retrying",
			);
			if (isLast) throw error;
			await new Promise((done) => setTimeout(done, retryDelayMs * attempt));
		}
	}

	throw new Error("unreachable");
}

/** Guards every repository read so a dropped connection surfaces as a clear failure. */
export function isDatabaseReady(): boolean {
	return connected && mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

export async function disconnectDatabase(): Promise<void> {
	if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) return;
	await mongoose.disconnect();
	connected = false;
}
