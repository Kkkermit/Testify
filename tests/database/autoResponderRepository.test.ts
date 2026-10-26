import { describeWithMongo } from "../helpers/mongo";
import { AutoResponderEntry } from "@database/models/autoResponder.schema";
import {
	createAutoResponder,
	deleteAutoResponder,
	findAutoResponder,
	listAutoResponders,
	purgeAutoResponders,
	updateAutoResponder,
} from "@database/repositories/autoResponderRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const BY = "100000000000000001";

const hi = { trigger: "Hi", match: "word", reply: "Hello!" } as const;
const roles = { trigger: "how do I get roles", match: "word", reply: "Pick them in #roles." } as const;

describeWithMongo("autoResponderRepository", () => {
	it("lists a server's responders oldest first", async () => {
		await createAutoResponder(GUILD, hi, BY);
		await createAutoResponder(GUILD, roles, BY);

		expect((await listAutoResponders(GUILD)).map((responder) => responder.trigger)).toEqual([
			"Hi",
			"how do I get roles",
		]);
	});

	/** Every query filters on the server, so one server's responders never answer in another. */
	it("keeps each server's responders apart", async () => {
		const created = await createAutoResponder(GUILD, hi, BY);

		expect(await listAutoResponders(OTHER)).toEqual([]);
		expect(await findAutoResponder(OTHER, created?.id ?? "")).toBeNull();
		expect(await deleteAutoResponder(OTHER, created?.id ?? "")).toBe(false);
		expect(await updateAutoResponder(OTHER, created?.id ?? "", roles, BY)).toBe("missing");
	});

	/** The unique index is the last word, so two presses at once cannot store the same words twice. */
	it("refuses the same words twice, whatever their case or spacing", async () => {
		await createAutoResponder(GUILD, hi, BY);

		expect(await createAutoResponder(GUILD, { ...hi, trigger: "  hI " }, BY)).toBeNull();
		expect(await createAutoResponder(OTHER, hi, BY)).not.toBeNull();
	});

	it("changes a responder, and refuses words another already has", async () => {
		const first = await createAutoResponder(GUILD, hi, BY);
		const second = await createAutoResponder(GUILD, roles, BY);

		expect(await updateAutoResponder(GUILD, second?.id ?? "", { ...roles, match: "exact" }, BY)).toEqual(
			expect.objectContaining({ match: "exact" }),
		);
		expect(await updateAutoResponder(GUILD, second?.id ?? "", { ...roles, trigger: "HI" }, BY)).toBe("duplicate");
		expect(await updateAutoResponder(GUILD, first?.id ?? "", { ...hi, reply: "Hey" }, BY)).toEqual(
			expect.objectContaining({ trigger: "Hi", reply: "Hey" }),
		);
	});

	/** The handler reads the cache on every message, so a write must be seen by the next one. */
	it("answers from the new list straight after every write", async () => {
		expect(await listAutoResponders(GUILD)).toEqual([]);

		const created = await createAutoResponder(GUILD, hi, BY);
		expect(await listAutoResponders(GUILD)).toHaveLength(1);

		await updateAutoResponder(GUILD, created?.id ?? "", { ...hi, reply: "Hey" }, BY);
		expect((await listAutoResponders(GUILD))[0]?.reply).toBe("Hey");

		await deleteAutoResponder(GUILD, created?.id ?? "");
		expect(await listAutoResponders(GUILD)).toEqual([]);
	});

	it("treats an id that is not one as missing rather than throwing", async () => {
		expect(await findAutoResponder(GUILD, "nope")).toBeNull();
		expect(await deleteAutoResponder(GUILD, "nope")).toBe(false);
		expect(await updateAutoResponder(GUILD, "nope", hi, BY)).toBe("missing");
	});

	it("forgets a server it leaves, and only that server", async () => {
		await createAutoResponder(GUILD, hi, BY);
		await createAutoResponder(OTHER, hi, BY);

		await purgeAutoResponders(GUILD);

		expect(await AutoResponderEntry.countDocuments({ guildId: GUILD })).toBe(0);
		expect(await listAutoResponders(GUILD)).toEqual([]);
		expect(await listAutoResponders(OTHER)).toHaveLength(1);
	});
});
