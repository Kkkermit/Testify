import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DiscordAPIError } from "discord.js";
import { EnvError } from "@config/env";
import { SetupError } from "@core/errors";
import { painter } from "@core/terminal";
import {
	BootReport,
	describeDatabase,
	explainStartupFailure,
	FATAL_CLOSE_CODES,
	MINIMUM_NODE,
	nodeTooOld,
	startupFailureLines,
} from "@lib/bot/startup.util";

const plain = painter(false);

function apiError(code: number, status: number): DiscordAPIError {
	return new DiscordAPIError({ code, message: "x" }, code, status, "PUT", "/applications", {});
}

describe("explainStartupFailure", () => {
	const missing = new EnvError({ name: ".env", path: "/bot/.env", exists: false }, [
		{ key: "DISCORD_TOKEN", missing: true, message: "is not set" },
		{ key: "DISCORD_CLIENT_ID", missing: false, message: "should be a Discord ID (17-20 digits)" },
	]);

	/** The old report printed zod's "expected string, received undefined", twice, with a stack. */
	it("names each unset value and where to find it, with no stack", () => {
		const failure = explainStartupFailure(missing, plain);
		const text = failure.lines.join("\n");

		expect(failure.stack).toBeUndefined();
		expect(text).toContain("There is no .env file yet");
		expect(text).toMatch(/DISCORD_TOKEN\s+is not set\n\s+↳ Developer Portal/);
		expect(text).toContain("should be a Discord ID");
		expect(text).toContain("npm run setup");
	});

	it("points a development bot at its own file and setup command", () => {
		const dev = new EnvError({ name: ".env.development", path: "/bot/.env.development", exists: true }, []);

		expect(explainStartupFailure(dev, plain).lines.join("\n")).toContain("npm run setup -- --dev");
	});

	it("passes a set-up explanation through as written", () => {
		const failure = explainStartupFailure(new SetupError("Line one\nLine two"), plain);

		expect(failure.lines).toEqual(["Line one", "Line two"]);
		expect(failure.stack).toBeUndefined();
	});

	it("reads Discord's refusals as the setting that caused them", () => {
		expect(explainStartupFailure(apiError(0, 401), plain).title).toMatch(/token/i);
		expect(explainStartupFailure(apiError(10002, 404), plain).lines.join(" ")).toContain("DISCORD_CLIENT_ID");
		expect(explainStartupFailure(apiError(50001, 403), plain).lines.join(" ")).toContain("DISCORD_DEV_GUILD_ID");
	});

	it("keeps the stack for anything it does not recognise, because that is a bug", () => {
		expect(explainStartupFailure(new TypeError("boom"), plain).stack).toContain("TypeError: boom");
	});
});

describe("FATAL_CLOSE_CODES", () => {
	/** Without the intents Discord closes the gateway with 4014, and the bot used to sit there never becoming ready. */
	it("says which intents to switch on", () => {
		expect(FATAL_CLOSE_CODES[4014]?.lines.join("\n")).toMatch(/Server Members Intent[\s\S]*Message Content Intent/);
	});
});

describe("startupFailureLines", () => {
	it("leads with a label a reader can scan for", () => {
		expect(startupFailureLines(explainStartupFailure(new SetupError("x"), plain), plain)[1]).toContain("ERROR");
	});
});

describe("describeDatabase", () => {
	/** It is printed on every start, so it must never carry the password a connection string holds. */
	it("shows the host and database but never the credentials", () => {
		const shown = describeDatabase("mongodb+srv://admin:hunter2@cluster0.example.mongodb.net/testify?retryWrites=true");

		expect(shown).toBe("cluster0.example.mongodb.net · testify");
		expect(shown).not.toContain("hunter2");
	});

	it("copes with several hosts and no database name", () => {
		expect(describeDatabase("mongodb://a:1,b:2")).toBe("a:1");
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
});

describe("nodeTooOld", () => {
	it("compares each part as a number, not as text", () => {
		expect(nodeTooOld("v22.22.2", "24.11.0")).toBe(true);
		expect(nodeTooOld("v24.9.0", "24.11.0")).toBe(true);
		expect(nodeTooOld("v24.11.0", "24.11.0")).toBe(false);
		expect(nodeTooOld("v25.0.0", "24.11.0")).toBe(false);
	});

	it("warns about the same version package.json requires", () => {
		const engines = (
			JSON.parse(readFileSync(resolve(__dirname, "../../..", "package.json"), "utf8")) as {
				engines: { node: string };
			}
		).engines.node;

		expect(engines).toBe(`>=${MINIMUM_NODE}`);
	});
});
