import { Events } from "discord.js";
import { toError } from "@core/errors";
import { defineEvent } from "@core/event";
import { inviteGuildIds } from "@database/repositories/inviteRepository";
import { primeInvites } from "@lib/invites";

/** Each server tracking invites is read once at start-up, or its first join after a restart could not be told apart. */
export default defineEvent({
	name: Events.ClientReady,
	once: true,
	async run(client) {
		const ids = await inviteGuildIds().catch((error: unknown) => {
			client.logger.warn({ err: toError(error) }, "[INVITES] Could not read which servers track invites.");
			return [];
		});

		// In turn, because each read is a request to Discord and there may be thousands.
		for (const id of ids) {
			const guild = client.guilds.cache.get(id);
			if (guild !== undefined) await primeInvites(guild);
		}
	},
});
