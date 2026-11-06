import { describeWithMongo } from "../helpers/mongo";
import { purgeGuild } from "@database/repositories/guildRepository";
import {
	getInviteSettings,
	latestJoinOf,
	markLeft,
	recordJoin,
	saveInviteSettings,
	topInviters,
} from "@database/repositories/inviteRepository";

const GUILD = "900000000000000001";
const KERMIT = "100000000000000001";
const SAM = "100000000000000003";

async function join(memberId: string, inviterId: string, minutesAgo: number): Promise<void> {
	await recordJoin({
		guildId: GUILD,
		memberId,
		memberName: memberId,
		inviterId,
		inviterName: inviterId === KERMIT ? "kermit" : "sam",
		code: "abc",
		vanity: false,
		joinedAt: new Date(Date.now() - minutesAgo * 60_000),
	});
}

describeWithMongo("inviteRepository", () => {
	/** A burst of joins that all left again must not top the board over somebody whose members stayed. */
	it("ranks inviters by the members who stayed", async () => {
		await Promise.all([
			join("200000000000000001", KERMIT, 5),
			join("200000000000000002", KERMIT, 4),
			join("200000000000000003", KERMIT, 3),
		]);
		await Promise.all([join("200000000000000004", SAM, 2), join("200000000000000005", SAM, 1)]);
		await Promise.all(
			["200000000000000001", "200000000000000002", "200000000000000003"].map((id) => markLeft(GUILD, id)),
		);

		expect(await topInviters(GUILD, 10)).toEqual([
			{ inviterId: SAM, inviterName: "sam", joins: 2, left: 0 },
			{ inviterId: KERMIT, inviterName: "kermit", joins: 3, left: 3 },
		]);
	});

	it("marks only the latest join of somebody who came back", async () => {
		await join("200000000000000001", KERMIT, 60);
		await markLeft(GUILD, "200000000000000001");
		await join("200000000000000001", SAM, 5);

		expect(await latestJoinOf(GUILD, "200000000000000001")).toMatchObject({ inviterId: SAM, leftAt: null });
	});

	it("forgets the settings and every join when the bot leaves", async () => {
		await saveInviteSettings(GUILD, { enabled: true }, KERMIT);
		await join("200000000000000001", KERMIT, 1);

		await purgeGuild(GUILD);

		expect(await getInviteSettings(GUILD)).toBeNull();
		expect(await latestJoinOf(GUILD, "200000000000000001")).toBeNull();
	});
});
