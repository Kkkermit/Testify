import { type TestifyClient } from "@core/client";
import { toError } from "@core/errors";
import {
	birthdaysDue,
	claimBirthday,
	forgetBirthday,
	getBirthdaySettings,
	releaseBirthday,
	type StoredBirthdaySettings,
} from "@database/repositories/birthdayRepository";
import { birthdaysOn, postBirthday } from "@lib/birthdays";

/** Each birthday is claimed for the year before it is posted, and handed back if the post may yet work. */
export async function announceBirthdays(client: TestifyClient, now: Date = new Date()): Promise<void> {
	const year = now.getUTCFullYear();
	const settingsOf = new Map<string, StoredBirthdaySettings | null>();

	// In order, so each claim is settled before the next post goes out.
	for (const birthday of await birthdaysDue(birthdaysOn(now), year)) {
		if (!settingsOf.has(birthday.guildId))
			settingsOf.set(birthday.guildId, await getBirthdaySettings(birthday.guildId));
		const settings = settingsOf.get(birthday.guildId);
		if (settings?.enabled !== true) continue;
		if (!(await claimBirthday(birthday.guildId, birthday.userId, year))) continue;

		const where = { guildId: birthday.guildId };
		try {
			const outcome = await postBirthday(client, birthday, settings);
			if (outcome === "gone") await forgetBirthday(birthday.guildId, birthday.userId);
			if (outcome === "unreachable") {
				await releaseBirthday(birthday.guildId, birthday.userId, year);
				client.logger.debug(
					where,
					"[BIRTHDAYS] A birthday could not be posted, because the bot cannot post in the channel.",
				);
			}
		} catch (error) {
			await releaseBirthday(birthday.guildId, birthday.userId, year);
			client.logger.warn(
				{ ...where, err: toError(error) },
				"[BIRTHDAYS] A birthday could not be posted. It will be tried again within the hour.",
			);
		}
	}
}
