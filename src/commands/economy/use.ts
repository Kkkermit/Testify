import { randomInt } from "node:crypto";
import { defineCommand, inGuild } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { adjustWallet, removeInventoryItem, requireAccount } from "../../database/repositories/economyRepository";
import { embed } from "../../lib/embeds";
import { formatNumber } from "../../lib/format";
import { reply } from "../../lib/reply";
import { findShopItem } from "../../lib/shop";

const OUTCOMES: Record<string, { verb: string; min: number; max: number; emoji: string }> = {
	fishing_rod: { verb: "You cast a line and reeled in a decent haul", min: 100, max: 900, emoji: "\u{1f3a3}" },
	hunting_rifle: {
		verb: "You went hunting and came back with something worth selling",
		min: 250,
		max: 1_800,
		emoji: "\u{1f52b}",
	},
	bank_upgrade: {
		verb: "You upgraded your bank and found some forgotten change inside",
		min: 0,
		max: 0,
		emoji: "\u{1f3e6}",
	},
};

export default defineCommand({
	name: "use",
	description: "Uses an item from your inventory.",
	category: "economy",
	guildOnly: true,
	cooldown: 10_000,
	options: [{ name: "item", description: "The item id to use.", type: "string", required: true, autocomplete: true }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const id = interaction.options.getString("item", true).toLowerCase().replace(/\s+/g, "_");
		const account = await requireAccount(guild.id, interaction.user.id);

		const definition = findShopItem(id);
		if (!definition) throw new UserFacingError(`There is no item with the id \`${id}\`.`);
		if (!definition.usable) throw new UserFacingError(`${definition.name} is not something you can use.`);

		const owned = account.inventory.find((entry) => entry.itemId === id);
		if (!owned || owned.quantity < 1) throw new UserFacingError(`You do not own a ${definition.name}.`);

		const consumed = await removeInventoryItem(guild.id, interaction.user.id, id, 1);
		if (!consumed) throw new UserFacingError(`You do not own a ${definition.name}.`);

		const outcome = OUTCOMES[id];
		const reward = outcome && outcome.max > 0 ? randomInt(outcome.min, outcome.max + 1) : 0;
		if (reward > 0) await adjustWallet(guild.id, interaction.user.id, reward);

		await reply(interaction, {
			embeds: [
				embed({
					category: "economy",
					title: `${definition.emoji} ${definition.name} used`,
					description:
						outcome && reward > 0
							? `${outcome.verb} \u2014 **${formatNumber(reward)}**.`
							: (definition.useDescription ?? "Nothing much happened."),
				}),
			],
		});
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
