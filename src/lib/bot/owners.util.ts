import { type TestifyClient } from "@core/client";

/** The bot's owners by name, for somebody blocked to know whom to ask; an owner Discord cannot find is left out. */
export async function ownerContacts(client: TestifyClient): Promise<{ id: string; name: string }[]> {
	const found = await Promise.all(
		client.env.DISCORD_OWNER_IDS.map(async (id) => {
			try {
				const user = await client.users.fetch(id);
				return { id, name: user.username };
			} catch {
				return null;
			}
		}),
	);

	return found.filter((owner) => owner !== null);
}
