import { getServers } from "node:dns";
import mongoose from "mongoose";
import { explainConnectionFailure, pingDatabase } from "@database/connection";

const SECRET = "sup3rs3cr3tw0rd";
const URI = `mongodb+srv://user:${SECRET}@cluster0.example.mongodb.net/testify`;

function driverError(message: string, code?: string): Error {
	return Object.assign(new Error(message), code === undefined ? {} : { code });
}

describe("explainConnectionFailure", () => {
	it("recognises a refused SRV lookup as a DNS problem", () => {
		const explanation = explainConnectionFailure(
			driverError("querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net", "ECONNREFUSED"),
			URI,
		);

		expect(explanation).toContain("could not look up the database's address");
		expect(explanation).toContain("1.1.1.1");
		expect(explanation).not.toContain("Authentication");
	});

	it("names the resolvers Node was actually using, which is the thing to change", () => {
		const explanation = explainConnectionFailure(driverError("querySrv ECONNREFUSED", "ECONNREFUSED"), URI);

		for (const server of getServers()) expect(explanation).toContain(server);
		expect(explanation).toContain("fe80::");
	});

	it("explains why nslookup can succeed while the bot fails", () => {
		const explanation = explainConnectionFailure(driverError("querySrv ECONNREFUSED", "ECONNREFUSED"), URI);
		expect(explanation).toContain("do not ask");
	});

	it("tells you the exact command to check it with", () => {
		const explanation = explainConnectionFailure(driverError("querySrv ECONNREFUSED", "ECONNREFUSED"), URI);
		expect(explanation).toContain("nslookup -type=SRV _mongodb._tcp.cluster0.example.mongodb.net");
	});

	it("copes with a connection string it cannot parse", () => {
		const explanation = explainConnectionFailure(driverError("querySrv ECONNREFUSED", "ECONNREFUSED"), "nonsense");
		expect(explanation).toContain("your-cluster-host");
	});

	it("points at a typo or a paused cluster when the host does not exist", () => {
		expect(explainConnectionFailure(driverError("getaddrinfo ENOTFOUND", "ENOTFOUND"), URI)).toContain("paused");
	});

	it("points at Database Access when the credentials are rejected", () => {
		const explanation = explainConnectionFailure(driverError("bad auth : Authentication failed."), URI);

		expect(explanation).toContain("username or password");
		expect(explanation).toContain("percent-encoded");
	});

	it("points at the IP allow list when it times out", () => {
		const explanation = explainConnectionFailure(driverError("Server selection timed out after 10000 ms"), URI);
		expect(explanation).toContain("Network Access");
	});

	it("falls back to the driver's own message for anything else", () => {
		expect(explainConnectionFailure(driverError("something odd happened"), URI)).toContain("something odd happened");
	});

	it("never leaks the password into the explanation", () => {
		for (const error of [
			driverError("querySrv ECONNREFUSED", "ECONNREFUSED"),
			driverError("bad auth : Authentication failed."),
			driverError("Server selection timed out"),
		]) {
			expect(explainConnectionFailure(error, URI)).not.toContain(SECRET);
		}
	});
});

describe("pingDatabase", () => {
	const connection = mongoose.connection as unknown as { readyState: number; db: unknown };
	const original = { readyState: connection.readyState, db: connection.db };

	afterEach(() => {
		Object.defineProperty(connection, "readyState", { value: original.readyState, configurable: true });
		Object.defineProperty(connection, "db", { value: original.db, configurable: true });
	});

	function connectedWith(command: () => Promise<unknown>): void {
		Object.defineProperty(connection, "readyState", { value: mongoose.ConnectionStates.connected, configurable: true });
		Object.defineProperty(connection, "db", { value: { command }, configurable: true });
	}

	it("answers null without a connection rather than waiting on one", async () => {
		await expect(pingDatabase()).resolves.toBeNull();
	});

	it("times one round trip", async () => {
		connectedWith(() => Promise.resolve({ ok: 1 }));

		await expect(pingDatabase()).resolves.toEqual(expect.any(Number));
	});

	it("gives up on a ping that never answers", async () => {
		connectedWith(() => new Promise(() => undefined));

		await expect(pingDatabase(20)).resolves.toBeNull();
	});

	it("treats a refused ping as no answer", async () => {
		connectedWith(() => Promise.reject(new Error("not primary")));

		await expect(pingDatabase()).resolves.toBeNull();
	});
});
