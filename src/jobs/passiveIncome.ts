import { type TestifyClient } from "../core/client";
import { Economy } from "../database/models/economy";
import { findBusiness, findHouse } from "../features/economy/data/shop";

/**
 * Pays out house and business income. Every credit is an atomic `$inc` rather
 * than the previous read-modify-`save()` over the whole collection.
 */
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
