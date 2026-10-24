import { describeWithMongo } from "../helpers/mongo";
import { StarPost } from "@database/models/starboard.schema";
import { purgeGuild } from "@database/repositories/settingsRepository";
import {
	claimStarPost,
	countStarPosts,
	deleteStarPost,
	findStarPost,
	findStarPostByBoardMessage,
	getStarboardSettings,
	markStarPostRemoved,
	recordStars,
	saveStarboardSettings,
	setBoardMessage,
} from "@database/repositories/starboardRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const MESSAGE = "500000000000000001";
const BOARD = "400000000000000009";

const fields = (guildId = GUILD, stars = 3) => ({
	guildId,
	messageId: MESSAGE,
	channelId: "400000000000000001",
	authorId: "100000000000000001",
	stars,
});

describeWithMongo("starboardRepository", () => {
	beforeAll(async () => {
		// The unique index is what decides a race; build it before the first test leans on it.
		await StarPost.syncIndexes();
	});

	it("starts a server's settings at the defaults and keeps what is changed", async () => {
		expect(await getStarboardSettings(GUILD)).toBeNull();

		await saveStarboardSettings(GUILD, { channelId: BOARD }, null);
		expect(await getStarboardSettings(GUILD)).toMatchObject({
			enabled: false,
			channelId: BOARD,
			threshold: 3,
			selfStar: false,
		});
	});

	/** Two ⭐ landing together must not both repost the message. */
	it("lets exactly one of several racing claims post", async () => {
		const results = await Promise.all(Array.from({ length: 5 }, () => claimStarPost(fields())));

		expect(results.filter((result) => result.created)).toHaveLength(1);
		expect(new Set(results.map((result) => result.post.messageId))).toEqual(new Set([MESSAGE]));
	});

	it("keeps one server's posts apart from another's", async () => {
		await claimStarPost(fields(GUILD));
		const elsewhere = await claimStarPost(fields(OTHER));

		expect(elsewhere.created).toBe(true);
		expect(await findStarPost(OTHER, MESSAGE)).not.toBeNull();
	});

	it("finds a post by its repost, and counts only those on the board", async () => {
		await claimStarPost(fields());
		expect(await countStarPosts(GUILD)).toBe(0);

		await setBoardMessage(GUILD, MESSAGE, { channelId: BOARD, messageId: "600000000000000001" });
		await recordStars(GUILD, MESSAGE, 7);

		expect(await findStarPostByBoardMessage(GUILD, "600000000000000001")).toMatchObject({
			messageId: MESSAGE,
			boardChannelId: BOARD,
			stars: 7,
		});
		expect(await countStarPosts(GUILD)).toBe(1);
	});

	/** A repost a moderator deleted must stay off the board, so the record outlives the repost. */
	it("remembers a repost that was taken down", async () => {
		await claimStarPost(fields());
		await setBoardMessage(GUILD, MESSAGE, { channelId: BOARD, messageId: "600000000000000001" });
		await markStarPostRemoved(GUILD, MESSAGE);

		expect(await findStarPost(GUILD, MESSAGE)).toMatchObject({
			removed: true,
			boardChannelId: null,
			boardMessageId: null,
		});
		expect(await countStarPosts(GUILD)).toBe(0);
	});

	it("deletes a post, and everything when the bot leaves", async () => {
		await claimStarPost(fields());
		expect(await deleteStarPost(GUILD, MESSAGE)).toMatchObject({ messageId: MESSAGE });
		expect(await findStarPost(GUILD, MESSAGE)).toBeNull();

		await claimStarPost(fields());
		await saveStarboardSettings(GUILD, { enabled: true }, null);
		await purgeGuild(GUILD);
		expect(await findStarPost(GUILD, MESSAGE)).toBeNull();
		expect(await getStarboardSettings(GUILD)).toBeNull();
	});
});
