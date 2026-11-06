import { describeWithMongo } from "../helpers/mongo";
import { Appeal } from "@database/models/appeal.schema";
import {
	appealGuildIds,
	createAppeal,
	decideAppeal,
	getAppealSettings,
	latestAppeal,
	reopenAppeal,
	saveAppealSettings,
} from "@database/repositories/appealRepository";
import { purgeGuild } from "@database/repositories/guildRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const KATE = "100000000000000001";
const MOD = "100000000000000002";

const FIELDS = { guildId: GUILD, userId: KATE, username: "kate", text: "I was spamming, and I will not again." };
const DECISION = { reason: "", by: MOD, byName: "mod", at: new Date("2026-11-06T12:00:00.000Z") };

describeWithMongo("appealRepository", () => {
	/** Two appeals sent at once from two tabs must not both reach staff. */
	it("holds one appeal waiting per person per server, and another once it is decided", async () => {
		const [first, second] = await Promise.all([createAppeal(FIELDS), createAppeal(FIELDS)]);
		expect([first, second].filter((appeal) => appeal !== null)).toHaveLength(1);
		expect(await createAppeal({ ...FIELDS, guildId: OTHER })).not.toBeNull();

		const open = first ?? second;
		await decideAppeal(GUILD, open?.id ?? "", { ...DECISION, status: "refused" });
		expect(await createAppeal(FIELDS)).not.toBeNull();
	});

	/** Two staff pressing at once: only one decision may stand, or a refusal could follow an unban. */
	it("decides an appeal only once, and puts a decision back when the unban fails", async () => {
		const appeal = await createAppeal(FIELDS);
		const id = appeal?.id ?? "";

		const [one, two] = await Promise.all([
			decideAppeal(GUILD, id, { ...DECISION, status: "accepted" }),
			decideAppeal(GUILD, id, { ...DECISION, status: "refused" }),
		]);
		expect([one, two].filter((decided) => decided !== null)).toHaveLength(1);

		await reopenAppeal(GUILD, id);
		expect(await latestAppeal(GUILD, KATE)).toMatchObject({ status: "open", decidedBy: null, reason: "" });
	});

	/** A decided appeal is kept a while so a refusal can hold back the next one, then MongoDB lets it go. */
	it("dates a decided appeal for deletion and leaves a waiting one alone", async () => {
		const appeal = await createAppeal(FIELDS);
		const expiry = async (): Promise<unknown> => (await Appeal.collection.findOne({ userId: KATE }))?.["expiresAt"];

		expect(await expiry()).toBeNull();
		await decideAppeal(GUILD, appeal?.id ?? "", { ...DECISION, status: "refused" });
		expect(await expiry()).toEqual(new Date(DECISION.at.getTime() + 180 * 86_400_000));
	});

	it("never reaches another server's appeal by id", async () => {
		const appeal = await createAppeal(FIELDS);

		expect(await decideAppeal(OTHER, appeal?.id ?? "", { ...DECISION, status: "accepted" })).toBeNull();
		expect(await decideAppeal(GUILD, "not-an-id", { ...DECISION, status: "accepted" })).toBeNull();
	});

	it("lists only servers that are on and have a channel", async () => {
		await saveAppealSettings(GUILD, { enabled: true, channelId: "400000000000000001" }, MOD);
		await saveAppealSettings(OTHER, { enabled: true, channelId: null }, MOD);

		expect(await appealGuildIds()).toEqual([GUILD]);
	});

	/** A server that removes the bot takes its appeals with it. */
	it("forgets the settings and every appeal when the bot leaves", async () => {
		await saveAppealSettings(GUILD, { enabled: true, channelId: "400000000000000001" }, MOD);
		await createAppeal(FIELDS);

		await purgeGuild(GUILD);

		expect(await getAppealSettings(GUILD)).toBeNull();
		expect(await latestAppeal(GUILD, KATE)).toBeNull();
	});
});
