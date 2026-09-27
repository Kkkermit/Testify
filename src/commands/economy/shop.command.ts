import { balancesOf } from "@buttons/shop";
import { defineCommand, inGuild } from "@core/command";
import { requireAccount } from "@database/repositories/economyRepository";
import { reply } from "@lib/discord";
import { isShopSection, SHOP_SECTIONS, shopScreen } from "@lib/economy";

/** The whole shop is one browsable panel. */
export default defineCommand({
	name: "shop",
	description: "Browses and buys from the shop.",
	category: "economy",
	aliases: ["store", "buy"],
	guildOnly: true,
	options: [
		{
			name: "section",
			description: "Jump straight to a part of the shop.",
			type: "string",
			choices: SHOP_SECTIONS.map((section) => ({ name: section, value: section })),
		},
	],

	async run(interaction) {
		const guild = inGuild(interaction);
		const section = interaction.options.getString("section") ?? "items";
		const account = await requireAccount(guild.id, interaction.user.id);

		await reply(
			interaction,
			shopScreen({ section: isShopSection(section) ? section : "items" }, balancesOf(account), interaction.user.id),
		);
	},
});
