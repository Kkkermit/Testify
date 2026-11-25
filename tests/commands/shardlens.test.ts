import shardlens, { sendNote, shardlensEmbed } from "@commands/owner/shardlens.command";
import { runChecks } from "@core/checks";
import { type ShardlensStatus } from "@testify/shared";
import { createMockClient, createMockInteraction, createMockUser, OWNER_ID } from "@tests/helpers/mocks";

const KEY = "slk_ingest_abcdefghijklmnopqrstuvwxyz0123456789";

const sending: ShardlensStatus = {
	state: "sending",
	collector: "https://stats.example.com",
	inBot: false,
	mode: "privacy",
	queued: 3,
	waitingForResponse: 1,
	dropped: 0,
	failedSends: 2,
	lastProblem: { name: "network", at: "2026-07-31T12:05:00.000Z" },
};

const textOf = (status: ShardlensStatus, note?: string): string =>
	JSON.stringify(shardlensEmbed(status, note).toJSON());

describe("/shardlens", () => {
	/** It names the collector, which nobody but the bot's owners should learn, so the gate refuses before `run`. */
	it("answers only the bot's owners, privately", async () => {
		expect(shardlens.ownerOnly).toBe(true);
		expect(shardlens.private).toBe(true);

		const stranger = createMockInteraction({ subcommand: "status" });
		const client = createMockClient();
		expect(await runChecks(stranger, shardlens, client)).not.toBeNull();
	});

	/** The collector inside the bot listens on its own machine, so its address is said to open nowhere else. */
	it("shows where analytics go and what is waiting, or only how to switch them on", () => {
		const cases = [
			{ status: sending, shows: ["https://stats.example.com", "Failed sends", "`network`"], hides: [] },
			{
				status: { ...sending, state: "off" as const, collector: null, lastProblem: null },
				shows: ["SHARDLENS_MONGODB=true", "SHARDLENS_URL"],
				hides: ["Failed sends"],
			},
			{
				status: { ...sending, collector: "http://127.0.0.1:8080", inBot: true },
				shows: ["http://127.0.0.1:8080, on the machine the bot runs on"],
				hides: [],
			},
		];

		const wrong = cases.filter(({ status, shows, hides }) => {
			const text = textOf(status);
			return shows.some((part) => !text.includes(part)) || hides.some((part) => text.includes(part));
		});
		expect(wrong.map(({ status }) => `${status.state} ${String(status.collector)}`)).toEqual([]);
	});

	/** The status comes from the client, which holds the key, so the reply is checked for it end to end. */
	it("never shows the ingest key", async () => {
		const client = createMockClient({
			env: { DISCORD_OWNER_IDS: [OWNER_ID], SHARDLENS_URL: "https://stats.example.com/v1", SHARDLENS_INGEST_KEY: KEY },
		} as never);
		const interaction = createMockInteraction({
			subcommand: "status",
			overrides: { user: createMockUser({ id: OWNER_ID, username: "owner" }) },
		});

		await shardlens.subcommands?.find((sub) => sub.name === "status")?.run(interaction, client);

		expect(interaction.sent).toHaveLength(1);
		expect(JSON.stringify(interaction.sent)).not.toContain("slk_");
	});

	it("says what Send now did", () => {
		const cases = [
			{ flushed: { sent: 3, problem: null, status: sending }, said: "Sent what was waiting." },
			{ flushed: { sent: 0, problem: null, status: sending }, said: "Nothing was waiting to send." },
			{ flushed: { sent: 0, problem: "network", status: sending }, said: "Could not send (`network`)." },
		];

		const wrong = cases.filter(({ flushed, said }) => !sendNote(flushed).startsWith(said)).map(({ said }) => said);
		expect(wrong).toEqual([]);
	});
});
