import { defineCommand, inGuild } from "@core/command";
import { requireAccount } from "@database/repositories/economyRepository";
import { reply } from "@lib/discord";
import { inventoryScreen } from "@lib/economy";

/** `use` is an alias rather than its own command. */
export default defineCommand({
	name: "inventory",
	description: "Shows what you own, and uses it.",
	category: "economy",
	aliases: ["inv", "use", "items"],
	guildOnly: true,
	options: [{ name: "user", description: "Whose inventory to view. Defaults to you.", type: "user" }],

	async run(interaction) {
		const guild = inGuild(interaction);
		const target = interaction.options.getUser("user") ?? interaction.user;
		const account = await requireAccount(guild.id, target.id);

		// Someone else's inventory is read-only, or Use would spend yours.
		const own = target.id === interaction.user.id;
		await reply(interaction, inventoryScreen(account, target.username, interaction.user.id, 0, undefined, own));
	},
});
