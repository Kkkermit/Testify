import { describeWithMongo } from "../helpers/mongo";
import { DEFAULT_PREFIX } from "@config/constants";
import { getAntiLink, setAntiLink } from "@database/repositories/antiLinkRepository";
import { getAuditLogConfig, setAuditLogConfig } from "@database/repositories/auditLogRepository";
import { createAutoResponder, listAutoResponders } from "@database/repositories/autoResponderRepository";
import { getAutoRoles, setAutoRoles } from "@database/repositories/autoRoleRepository";
import { getFixedStats, setFixedStats } from "@database/repositories/botStatsRepository";
import { getCounting, setCounting } from "@database/repositories/countingRepository";
import { getGoodbyeSettings, saveGoodbyeSettings } from "@database/repositories/goodbyeRepository";
import { purgeGuild } from "@database/repositories/guildRepository";
import { getPrefixConfig, setPrefix } from "@database/repositories/prefixRepository";
import { listSticky, setSticky } from "@database/repositories/stickyRepository";
import { getTreasureConfig, saveTreasureConfig } from "@database/repositories/treasureRepository";
import { getVoiceCounter, setVoiceCounter } from "@database/repositories/voiceCounterRepository";
import { getWelcome, saveWelcome } from "@database/repositories/welcomeRepository";

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const CHANNEL = "400000000000000001";
const ADMIN = "100000000000000001";

async function configure(guildId: string): Promise<void> {
	await Promise.all([
		setPrefix(guildId, "!"),
		setAntiLink(guildId, "ManageMessages"),
		setAuditLogConfig(guildId, CHANNEL, ["all"]),
		setAutoRoles(guildId, ["300000000000000001"]),
		setCounting(guildId, CHANNEL, 100),
		setSticky(guildId, CHANNEL, "Read the rules", 5),
		saveWelcome(guildId, { channelId: CHANNEL, message: "Hello {user}" }),
		setVoiceCounter(guildId, { memberChannelId: CHANNEL }),
		setFixedStats(guildId, CHANNEL, "500000000000000001", ADMIN),
		saveTreasureConfig(guildId, { lastModifiedBy: ADMIN }),
		saveGoodbyeSettings(guildId, { enabled: true, channelId: CHANNEL }, ADMIN),
		createAutoResponder(guildId, { trigger: "rules", match: "word", reply: "Read #rules." }, ADMIN),
	]);
}

async function settingsOf(guildId: string) {
	return {
		prefix: (await getPrefixConfig(guildId)).prefix,
		antiLink: await getAntiLink(guildId),
		auditLog: await getAuditLogConfig(guildId),
		autoRoles: await getAutoRoles(guildId),
		counting: await getCounting(guildId),
		sticky: await listSticky(guildId),
		welcome: await getWelcome(guildId),
		voiceCounter: await getVoiceCounter(guildId),
		botStats: await getFixedStats(guildId),
		treasure: await getTreasureConfig(guildId),
		goodbye: await getGoodbyeSettings(guildId),
		autoResponders: await listAutoResponders(guildId),
	};
}

describeWithMongo("guildRepository", () => {
	/** Each feature keeps its own collection, so leaving a server has to reach every one of them. */
	it("forgets every setting of the server the bot left", async () => {
		await configure(GUILD);

		await purgeGuild(GUILD);

		expect(await settingsOf(GUILD)).toEqual({
			prefix: DEFAULT_PREFIX,
			antiLink: null,
			auditLog: null,
			autoRoles: null,
			counting: null,
			sticky: [],
			welcome: null,
			voiceCounter: null,
			botStats: null,
			treasure: null,
			goodbye: null,
			autoResponders: [],
		});
	});

	it("leaves every other server alone", async () => {
		await configure(GUILD);
		await configure(OTHER);

		await purgeGuild(GUILD);

		const other = await settingsOf(OTHER);
		expect(other.prefix).toBe("!");
		expect(Object.values(other).every((value) => value !== null && !(Array.isArray(value) && value.length === 0))).toBe(
			true,
		);
	});
});
