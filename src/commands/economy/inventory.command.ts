import { defineCommand, inGuild } from "@core/command";
import { requireAccount } from "@database/repositories/economyRepository";
import { inventoryScreen } from "@lib/inventoryScreen.util";
import { reply } from "@lib/reply.util";

/**
 * `use` is an alias rather than its own command. `/use <item>` made you name an
 * item from a hardcoded list of three, while every row here already has a Use
 * button beside the thing it uses.
 */
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

		// Someone else's inventory is a read-only card: the Use buttons would
		// otherwise show their items while spending yours.
		const own = target.id === interaction.user.id;
		await reply(interaction, inventoryScreen(account, target.username, interaction.user.id, 0, undefined, own));
	},
});
