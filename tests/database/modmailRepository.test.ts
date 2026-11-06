import { describeWithMongo } from "../helpers/mongo";
import { purgeGuild } from "@database/repositories/guildRepository";
import {
	claimConversation,
	closeConversation,
	conversationByThread,
	getModmailSettings,
	openConversationOf,
	saveModmailSettings,
	setConversationThread,
} from "@database/repositories/modmailRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const KATE = "100000000000000001";
const SAM = "100000000000000002";

const fields = (guildId: string) => ({ guildId, userId: KATE, username: "kate" });

describeWithMongo("modmailRepository", () => {
	/** A direct message goes to the one conversation its sender has open, so two forms sent at once must open one. */
	it("holds one open conversation per person across every server, and another once it closes", async () => {
		const [first, second] = await Promise.all([claimConversation(fields(GUILD)), claimConversation(fields(OTHER))]);
		const open = first ?? second;
		expect([first, second].filter((claim) => claim !== null)).toHaveLength(1);

		await closeConversation(open?.guildId ?? "", open?.id ?? "", SAM);
		expect(await claimConversation(fields(OTHER))).not.toBeNull();
	});

	/** Staff and the member closing together must not both tell the other side. */
	it("closes a conversation once, and finds it by its thread only while it is open", async () => {
		const claimed = await claimConversation(fields(GUILD));
		const id = claimed?.id ?? "";
		await setConversationThread(GUILD, id, "600000000000000001");
		expect(await conversationByThread("600000000000000001")).toMatchObject({ id });

		const [one, two] = await Promise.all([closeConversation(GUILD, id, SAM), closeConversation(GUILD, id, KATE)]);
		expect([one, two].filter((closed) => closed !== null)).toHaveLength(1);
		expect(await conversationByThread("600000000000000001")).toBeNull();
		expect(await openConversationOf(KATE)).toBeNull();
	});

	it("never closes another server's conversation by id", async () => {
		const claimed = await claimConversation(fields(GUILD));

		expect(await closeConversation(OTHER, claimed?.id ?? "", SAM)).toBeNull();
		expect(await closeConversation(GUILD, "not-an-id", SAM)).toBeNull();
	});

	/** A server that removes the bot takes its mod mail with it. */
	it("forgets the settings and every conversation when the bot leaves", async () => {
		await saveModmailSettings(GUILD, { enabled: true, channelId: "400000000000000001" }, SAM);
		await claimConversation(fields(GUILD));

		await purgeGuild(GUILD);

		expect(await getModmailSettings(GUILD)).toBeNull();
		expect(await openConversationOf(KATE)).toBeNull();
	});
});
