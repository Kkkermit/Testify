import { balancesOf } from "@buttons/shop";
import { defineCommand, inGuild } from "@core/command";
import { requireAccount } from "@database/repositories/economyRepository";
import { reply } from "@lib/reply.util";
import { isShopSection, SHOP_SECTIONS, shopScreen } from "@lib/shopScreen.util";

/**
 * The whole shop is one browsable panel.
 *
 * There used to be a `buy` subcommand taking a raw `id` string, so buying meant
 * reading an ID out of `/shop view` and retyping it — and a `sell` subcommand that
 * silently sold your house with no confirmation. Both are now buttons on the
 * screen that already lists what you can afford.
 */
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
