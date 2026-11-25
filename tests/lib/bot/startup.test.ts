import { painter } from "@core/terminal";
import { BootReport, describeDatabase, nodeTooOld, StartupStopped } from "@lib/bot/startup.util";

const plain = painter(false);

describe("describeDatabase", () => {
	/** It is printed on every start, so it must never carry the password a connection string holds. */
	it("shows the host and database but never the credentials", () => {
		const shown = describeDatabase("mongodb+srv://admin:hunter2@cluster0.example.mongodb.net/testify?retryWrites=true");

		expect(shown).toBe("cluster0.example.mongodb.net · testify");
		expect(shown).not.toContain("hunter2");
	});
});

describe("BootReport", () => {
	it("reports a step's result and rethrows its failure after marking it", async () => {
		const lines: string[] = [];
		const report = new BootReport((line) => lines.push(line), plain);

		await expect(
			report.step(
				"Modules",
				() => 3,
				(count) => `${String(count)} loaded`,
			),
		).resolves.toBe(3);
		await expect(
			report.step(
				"Database",
				() => Promise.reject(new Error("down")),
				() => "",
			),
		).rejects.toThrow("down");

		expect(lines[0]).toMatch(/✔ Modules\s+3 loaded/);
		expect(lines[1]).toMatch(/✖ Database/);
	});

	/** A reload mid-start printed "connected", then the failures its own shutdown caused, as if both were true. */
	it("says nothing once the bot is shutting down, and ends start-up rather than report what that undid", async () => {
		const lines: string[] = [];
		let stopping = false;
		const report = new BootReport((line) => lines.push(line), plain).stopWhen(() => stopping);

		const connecting = report.step(
			"Database",
			() => {
				stopping = true;
				return "ok";
			},
			() => "connected",
		);
		await expect(connecting).rejects.toBeInstanceOf(StartupStopped);
		await expect(
			report.step(
				"Logs",
				() => Promise.reject(new Error("Client must be connected before running operations")),
				() => "",
			),
		).rejects.toBeInstanceOf(StartupStopped);
		report.note("working", "Discord", "logging in…");

		expect(lines).toEqual([]);
	});
});

describe("nodeTooOld", () => {
	it("compares each part as a number, not as text", () => {
		expect(nodeTooOld("v22.22.2", "24.11.0")).toBe(true);
		expect(nodeTooOld("v24.9.0", "24.11.0")).toBe(true);
		expect(nodeTooOld("v24.11.0", "24.11.0")).toBe(false);
		expect(nodeTooOld("v25.0.0", "24.11.0")).toBe(false);
	});
});
