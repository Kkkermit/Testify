import { describeWithMongo } from "../helpers/mongo";
import { INSTANCE_DEFAULTS, useInstance } from "@config/instance";
import { GuildPrefix } from "@database/models/prefix.schema";
import { clearPrefixCache, getPrefix, setPrefix, setPrefixEnabled } from "@database/repositories/prefixRepository";

const ON_DEFAULT = "900000000000000001";
const CHOSE_ITS_OWN = "900000000000000002";

describeWithMongo("prefixRepository", () => {
	/** A stored copy of the default would pin that server to it, so a host changing the default would never reach it. */
	it("stores the default as nothing, so a host's new default reaches every server that never chose one", async () => {
		await setPrefix(CHOSE_ITS_OWN, "!");
		await setPrefix(ON_DEFAULT, "?");
		await setPrefix(ON_DEFAULT, INSTANCE_DEFAULTS.defaultPrefix);
		await setPrefixEnabled(ON_DEFAULT, false);

		useInstance({ ...INSTANCE_DEFAULTS, defaultPrefix: "$" });
		clearPrefixCache();

		expect(await GuildPrefix.findOne({ guildId: ON_DEFAULT }).lean().exec()).not.toHaveProperty("prefix");
		expect([await getPrefix(ON_DEFAULT), await getPrefix(CHOSE_ITS_OWN)]).toEqual(["$", "!"]);
	});
});
