import { randomInt } from "node:crypto";
import { defineCommand, inGuild } from "@core/command";
import { UserFacingError } from "@core/errors";
import { requireAccount } from "@database/repositories/economyRepository";
import { useItem } from "@lib/economyActions.util";
import { inventoryScreen } from "@lib/inventoryScreen.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "use",
	description: "Uses an item from your inventory.",
	category: "economy",
	guildOnly: true,
	cooldown: 10_000,
	options: [{ name: "item", description: "The item to use.", type: "string", required: true, autocomplete: true }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const id = interaction.options.getString("item", true).toLowerCase().replace(/\s+/g, "_");

		const result = await useItem(guild.id, interaction.user.id, id, (min, max) => randomInt(min, max + 1));
		if (!result.used) throw new UserFacingError(result.message);

		// Returns the inventory panel, so the next item is one press away rather
		// than another round of typing.
		const account = await requireAccount(guild.id, interaction.user.id);
		await reply(
			interaction,
			inventoryScreen(account, interaction.user.username, interaction.user.id, 0, result.message),
		);
	},

	async autocomplete(interaction) {
		const query = interaction.options.getFocused().toLowerCase();
		const matches = [
			{ id: "fishing_rod", name: "Fishing Rod" },
			{ id: "hunting_rifle", name: "Hunting Rifle" },
			{ id: "bank_upgrade", name: "Bank Upgrade" },
		].filter((entry) => entry.id.includes(query) || entry.name.toLowerCase().includes(query));

		await interaction.respond(matches.map((entry) => ({ name: entry.name, value: entry.id })));
	},
});
