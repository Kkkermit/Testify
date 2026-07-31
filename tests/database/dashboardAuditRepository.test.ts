import {
	auditPage,
	countAudits,
	type NewAudit,
	recentAudits,
	recordAudit,
} from "@database/repositories/dashboardAuditRepository";
import { describeWithMongo, mongoAvailable } from "@tests/helpers/mongo";

const GUILD = "900000000000000001";

function entry(overrides: Partial<NewAudit> = {}): NewAudit {
	return {
		actorId: "100000000000000001",
		actorTag: "someone",
		guildId: GUILD,
		action: "levelling.update",
		summary: "Turned levelling on",
		...overrides,
	};
}

describeWithMongo("the dashboard audit repository", () => {
	it("records what changed alongside who changed it", async () => {
		if (!mongoAvailable()) return;
		await recordAudit(entry({ before: { enabled: false }, after: { enabled: true } }));

		const [record] = await recentAudits(GUILD);
		expect(record).toMatchObject({ actorTag: "someone", action: "levelling.update", after: { enabled: true } });
		expect(record?.at).toBeInstanceOf(Date);
	});

	it("lists the newest change first", async () => {
		if (!mongoAvailable()) return;
		await recordAudit(entry({ summary: "first" }));
		await recordAudit(entry({ summary: "second" }));

		expect((await recentAudits(GUILD)).map((record) => record.summary)).toEqual(["second", "first"]);
	});

	/** The overview card shows a handful; a guild with thousands of changes must not send them all. */
	it("honours the limit it is given", async () => {
		if (!mongoAvailable()) return;
		for (let index = 0; index < 5; index += 1) await recordAudit(entry({ summary: `change ${String(index)}` }));

		expect(await recentAudits(GUILD, 2)).toHaveLength(2);
	});

	it("keeps one guild's history out of another's", async () => {
		if (!mongoAvailable()) return;
		await recordAudit(entry());
		await recordAudit(entry({ guildId: "900000000000000002" }));

		expect(await countAudits(GUILD)).toBe(1);
	});

	it("pages through the history", async () => {
		if (!mongoAvailable()) return;
		for (let index = 0; index < 5; index += 1) await recordAudit(entry({ summary: `change ${String(index)}` }));

		expect((await auditPage(GUILD, 2, 2)).map((record) => record.summary)).toEqual(["change 2", "change 1"]);
	});

	/** A page number out of a URL can be anything; page zero must not turn into a negative skip. */
	it("treats a page below one as the first page", async () => {
		if (!mongoAvailable()) return;
		await recordAudit(entry({ summary: "only" }));

		expect(await auditPage(GUILD, 0, 2)).toHaveLength(1);
	});

	it("returns nothing for a page past the end", async () => {
		if (!mongoAvailable()) return;
		await recordAudit(entry());

		expect(await auditPage(GUILD, 9, 25)).toEqual([]);
	});
});
