import { DashboardAudits } from "@database/models/dashboardAudit.schema";
import {
	auditPage,
	auditsSince,
	countAudits,
	type NewAudit,
	recentAudits,
	recordAudit,
} from "@database/repositories/dashboardAuditRepository";
import { describeWithMongo } from "@tests/helpers/mongo";

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
		await recordAudit(entry({ before: { enabled: false }, after: { enabled: true } }));

		const [record] = await recentAudits(GUILD);
		expect(record).toMatchObject({ actorTag: "someone", action: "levelling.update", after: { enabled: true } });
		expect(record?.at).toBeInstanceOf(Date);
	});

	it("lists the newest change first", async () => {
		await recordAudit(entry({ summary: "first" }));
		await recordAudit(entry({ summary: "second" }));

		expect((await recentAudits(GUILD)).map((record) => record.summary)).toEqual(["second", "first"]);
	});

	/** The overview card shows a handful; a guild with thousands of changes must not send them all. */
	it("honours the limit it is given", async () => {
		for (let index = 0; index < 5; index += 1) await recordAudit(entry({ summary: `change ${String(index)}` }));

		expect(await recentAudits(GUILD, 2)).toHaveLength(2);
	});

	/** Moderation is what `/case list` shows only to Moderate Members, so a reader without it never receives a record. */
	it("leaves moderation out for a reader who may not see it, from every read", async () => {
		for (const action of ["member.warn", "member.warn.clear", "member.kick", "member.ban", "member.timeout.lift"]) {
			await recordAudit(entry({ action }));
		}
		await recordAudit(entry({ action: "member.money" }));
		await recordAudit(entry({ action: "member.warnings-export" }));
		const reader = { moderation: false };

		expect((await recentAudits(GUILD, 20, reader)).map((record) => record.action).sort()).toEqual([
			"member.money",
			"member.warnings-export",
		]);
		expect(await countAudits(GUILD, reader)).toBe(2);
		expect(await auditPage(GUILD, 1, 25, reader)).toHaveLength(2);
		expect(await auditsSince(GUILD, new Date(0), 500, reader)).toHaveLength(2);
		expect(await countAudits(GUILD)).toBe(7);
	});

	it("keeps one guild's history out of another's", async () => {
		await recordAudit(entry());
		await recordAudit(entry({ guildId: "900000000000000002" }));

		expect(await countAudits(GUILD)).toBe(1);
	});

	it("pages through the history", async () => {
		for (let index = 0; index < 5; index += 1) await recordAudit(entry({ summary: `change ${String(index)}` }));

		expect((await auditPage(GUILD, 2, 2)).map((record) => record.summary)).toEqual(["change 2", "change 1"]);
	});

	/** Changes sharing one timestamp still page consistently, because `_id` breaks the tie. */
	it("pages consistently when every change shares a timestamp", async () => {
		for (let index = 0; index < 5; index += 1) await recordAudit(entry({ summary: `change ${String(index)}` }));
		await DashboardAudits.updateMany({ guildId: GUILD }, { $set: { at: new Date("2026-01-01T00:00:00.000Z") } });

		const seen = [
			...(await auditPage(GUILD, 1, 2)),
			...(await auditPage(GUILD, 2, 2)),
			...(await auditPage(GUILD, 3, 2)),
		].map((record) => record.summary);

		expect(seen).toEqual(["change 4", "change 3", "change 2", "change 1", "change 0"]);
		expect(new Set(seen).size).toBe(5);
	});

	/** A page number out of a URL can be anything; page zero must not turn into a negative skip. */
	it("treats a page below one as the first page", async () => {
		await recordAudit(entry({ summary: "only" }));

		expect(await auditPage(GUILD, 0, 2)).toHaveLength(1);
	});

	it("returns nothing for a page past the end", async () => {
		await recordAudit(entry());

		expect(await auditPage(GUILD, 9, 25)).toEqual([]);
	});
});
