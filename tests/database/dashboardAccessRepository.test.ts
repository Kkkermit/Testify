import { DashboardAccess } from "@database/models/dashboardAccess.schema";
import {
	addAccess,
	changeAccess,
	countAccess,
	findAccess,
	listAccess,
	markAccessSeen,
	purgeDashboardAccess,
	removeAccess,
} from "@database/repositories/dashboardAccessRepository";
import { type AccessArea } from "@testify/shared";
import { describeWithMongo } from "@tests/helpers/mongo";

const A = "900000000000000001";
const B = "900000000000000002";
const HELPER = "100000000000000006";
const ADMIN = "100000000000000003";

function given(guildId: string, areas: AccessArea[] = ["bans"]) {
	return addAccess({ guildId, userId: HELPER, username: "helper", areas, addedBy: ADMIN, addedByName: "admin" });
}

describeWithMongo("the dashboard access repository", () => {
	/** Every lookup is keyed by the server in the address, so one server's admin can never touch another's grants. */
	it("never finds, lists, changes or removes a grant through another server", async () => {
		await given(A);

		const found = await findAccess(B, HELPER);
		const listed = await listAccess(B);
		const counted = await countAccess(B);
		const changed = await changeAccess(B, HELPER, ["cases"]);
		const removed = await removeAccess(B, HELPER);

		expect([found, listed, counted, changed, removed]).toEqual([null, [], 0, null, false]);
		expect((await findAccess(A, HELPER))?.areas).toEqual(["bans"]);
	});

	/** Two admins adding the same person at once must leave one record, not two that disagree. */
	it("stores one grant when the same person is added twice at once", async () => {
		await DashboardAccess.init();

		const answers = await Promise.all([given(A), given(A, ["cases"])]);

		expect(answers.filter((row) => row === null)).toHaveLength(1);
		expect(await countAccess(A)).toBe(1);
	});

	/** The list of screens is the boundary, so neither a new grant nor a change may store one that is not on it. */
	it("refuses a screen that is not one to give, whether added or changed", async () => {
		await given(A);

		await expect(given(B, ["access"] as never)).rejects.toThrow();
		await expect(changeAccess(A, HELPER, ["access"] as never)).rejects.toThrow();
		expect((await findAccess(A, HELPER))?.areas).toEqual(["bans"]);
		expect(await findAccess(B, HELPER)).toBeNull();
	});

	it("writes when somebody was last here at most once every ten minutes", async () => {
		await given(A);
		const first = new Date("2026-11-07T10:00:00.000Z");

		await markAccessSeen(A, HELPER, first);
		await markAccessSeen(A, HELPER, new Date(first.getTime() + 5 * 60_000));
		const soon = (await findAccess(A, HELPER))?.lastSeenAt;
		await markAccessSeen(A, HELPER, new Date(first.getTime() + 11 * 60_000));
		const later = (await findAccess(A, HELPER))?.lastSeenAt;

		expect(soon).toEqual(first);
		expect(later).toEqual(new Date(first.getTime() + 11 * 60_000));
	});

	it("forgets only the server the bot left", async () => {
		await Promise.all([given(A), given(B)]);

		await purgeDashboardAccess(A);

		expect([await countAccess(A), await countAccess(B)]).toEqual([0, 1]);
	});
});
