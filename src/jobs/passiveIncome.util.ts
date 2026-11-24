import { type TestifyClient } from "@core/client";
import { creditBank, incomeEarners } from "@database/repositories/economyRepository";
import { findBusiness, findHouse } from "@lib/economy";

/** Pays each house and business its hourly income into the owner's bank. */
export async function payPassiveIncome(client: TestifyClient): Promise<void> {
	let paid = 0;
	let total = 0;

	for await (const account of incomeEarners()) {
		const houseId = account.house?.houseId;
		let income = houseId === undefined ? 0 : (findHouse(houseId)?.income ?? 0);
		for (const business of account.businesses ?? []) income += findBusiness(business.businessId)?.income ?? 0;
		if (income <= 0) continue;

		await creditBank(account.guildId, account.userId, income);
		paid += 1;
		total += income;
	}

	if (paid > 0) client.logger.debug({ accounts: paid, total }, "[INCOME] Paid passive income.");
}
