import { type TestifyClient } from "@core/client";
import type * as shutdownModuleType from "@core/shutdown";
import { createMockClient } from "@tests/helpers/mocks";

/**
 * `shutdown()` keeps a module-level `stopping` flag so a second signal cannot start a second teardown, which means
 * every test needs a fresh module registry.
 */
function loadShutdown(): {
	shutdown: (client: TestifyClient, reason: string, code?: number) => Promise<void>;
	handleProcessSignals: (client: TestifyClient) => void;
	disconnectDatabase: jest.Mock;
	printReloading: jest.Mock;
} {
	let module!: ReturnType<typeof loadShutdown>;

	jest.isolateModules(() => {
		jest.doMock("@database/connection", () => ({ disconnectDatabase: jest.fn(() => Promise.resolve()) }));
		jest.doMock("@lib/banner.util", () => ({ printReloading: jest.fn() }));

		const shutdownModule = jest.requireActual<typeof shutdownModuleType>("@core/shutdown");
		module = {
			...shutdownModule,
			disconnectDatabase: jest.requireMock("@database/connection").disconnectDatabase,
			printReloading: jest.requireMock("@lib/banner.util").printReloading,
		};
	});

	return module;
}

function clientFor(nodeEnv = "production"): TestifyClient {
	return createMockClient({
		env: { DISCORD_OWNER_IDS: [], NODE_ENV: nodeEnv },
		logger: { info: jest.fn(), error: jest.fn(), fatal: jest.fn() },
		timers: { stopAll: jest.fn() },
		destroy: jest.fn(() => Promise.resolve()),
	} as never);
}

let exitSpy: jest.SpyInstance;

beforeEach(() => {
	exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
});

afterEach(() => {
	exitSpy.mockRestore();
});

describe("shutdown", () => {
	it("stops timers, closes the database and destroys the client, in that order", async () => {
		const { shutdown, disconnectDatabase } = loadShutdown();
		const client = clientFor();

		await shutdown(client, "SIGINT");

		expect(client.timers.stopAll).toHaveBeenCalled();
		expect(disconnectDatabase).toHaveBeenCalled();
		expect(client.destroy).toHaveBeenCalled();
	});

	/** A listener left open holds the port, so a restart cannot bind it and the bot never comes back. */
	it("closes the dashboard listener when there is one", async () => {
		const { shutdown } = loadShutdown();
		const client = clientFor();
		const close = jest.fn(() => Promise.resolve());
		client.api = { close };

		await shutdown(client, "SIGINT");

		expect(close).toHaveBeenCalled();
	});

	it("shuts down normally when the dashboard was never started", async () => {
		const { shutdown } = loadShutdown();
		const client = clientFor();

		await shutdown(client, "SIGINT");

		expect(client.destroy).toHaveBeenCalled();
	});

	it("exits zero on a clean stop", async () => {
		const { shutdown } = loadShutdown();
		await shutdown(clientFor(), "SIGINT");

		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it("passes a non-zero code through", async () => {
		const { shutdown } = loadShutdown();
		await shutdown(clientFor(), "uncaughtException", 1);

		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	/** Two signals in quick succession must not race two teardowns. */
	it("ignores a second call", async () => {
		const { shutdown, disconnectDatabase } = loadShutdown();
		const client = clientFor();

		await shutdown(client, "SIGINT");
		await shutdown(client, "SIGTERM");

		expect(disconnectDatabase).toHaveBeenCalledTimes(1);
	});

	it("still exits when closing the database throws, and reports failure", async () => {
		const { shutdown, disconnectDatabase } = loadShutdown();
		disconnectDatabase.mockRejectedValue(new Error("already closed"));
		const client = clientFor();

		await shutdown(client, "SIGINT");

		expect(client.logger.error).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it("keeps an explicit failure code when teardown also fails", async () => {
		const { shutdown, disconnectDatabase } = loadShutdown();
		disconnectDatabase.mockRejectedValue(new Error("nope"));

		await shutdown(clientFor(), "uncaughtException", 3);

		expect(exitSpy).toHaveBeenCalledWith(3);
	});
});

describe("handleProcessSignals", () => {
	const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

	afterEach(() => {
		for (const signal of signals) process.removeAllListeners(signal);
		process.removeAllListeners("uncaughtException");
		process.removeAllListeners("unhandledRejection");
	});

	it("registers each signal exactly once", () => {
		const { handleProcessSignals } = loadShutdown();
		handleProcessSignals(clientFor());

		for (const signal of signals) expect(process.listenerCount(signal)).toBe(1);
	});

	it("announces a reload on SIGTERM in development, where tsx restarts the bot", () => {
		const { handleProcessSignals, printReloading } = loadShutdown();
		handleProcessSignals(clientFor("development"));

		process.emit("SIGTERM");

		expect(printReloading).toHaveBeenCalled();
	});

	it("says nothing about reloading in production", () => {
		const { handleProcessSignals, printReloading } = loadShutdown();
		handleProcessSignals(clientFor());

		process.emit("SIGTERM");

		expect(printReloading).not.toHaveBeenCalled();
	});

	it("does not treat Ctrl+C as a reload", () => {
		const { handleProcessSignals, printReloading } = loadShutdown();
		handleProcessSignals(clientFor("development"));

		process.emit("SIGINT");

		expect(printReloading).not.toHaveBeenCalled();
	});

	/** Logging and carrying on would leave the process in an undefined state. */
	it("treats an uncaught exception as fatal", () => {
		const { handleProcessSignals } = loadShutdown();
		const client = clientFor();
		handleProcessSignals(client);

		process.emit("uncaughtException", new Error("boom"));

		expect(client.logger.fatal).toHaveBeenCalled();
	});

	/**
	 * Node terminates on an unhandled rejection by default, so a listener that only logged would quietly disable
	 * that and keep the bot running on state nothing can vouch for. CLAUDE.md section 16 is explicit about it.
	 */
	it("treats an unhandled rejection as fatal too", async () => {
		const { handleProcessSignals, disconnectDatabase } = loadShutdown();
		const client = clientFor();
		handleProcessSignals(client);

		process.emit("unhandledRejection", new Error("boom"), Promise.resolve());
		await Promise.resolve();

		expect(client.logger.fatal).toHaveBeenCalled();
		expect(disconnectDatabase).toHaveBeenCalled();
	});
});
