import { type TestifyClient } from "@core/client";
import { Economy } from "@database/models/economy.schema";
import { findBusiness, findHouse } from "@lib/shop.util";

/** Pays out house and business income. */
export async function payPassiveIncome(client: TestifyClient): Promise<void> {
	const cursor = Economy.find({
		$or: [{ house: { $ne: null } }, { "businesses.0": { $exists: true } }],
	})
		.select({ guildId: 1, userId: 1, house: 1, businesses: 1 })
		.lean()
		.cursor();

	let paid = 0;
	let total = 0;

	for await (const account of cursor) {
		let income = 0;

		if (account.house !== null) income += findHouse(account.house.houseId)?.income ?? 0;
		for (const business of account.businesses) {
			income += findBusiness(business.businessId)?.income ?? 0;
		}

		if (income <= 0) continue;

		await Economy.updateOne({ guildId: account.guildId, userId: account.userId }, { $inc: { bank: income } }).exec();
		paid += 1;
		total += income;
	}

	if (paid > 0) client.logger.debug({ accounts: paid, total }, "Paid passive income");
}
