import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed, successEmbed } from "../../../ui/embeds";

export default defineCommand({
	name: "dm",
	description: "Sends a direct message through the bot.",
	category: Category.Owner,
	surfaces: ["slash"],
	ownerOnly: true,
	options: [
		{ name: "user", description: "Who to message.", type: "user", required: true },
		{ name: "message", description: "What to say.", type: "string", required: true, maxLength: 1_800 },
	],

	async execute(ctx) {
		const target = ctx.options.getUser("user", true);
		const content = ctx.options.getString("message", true);

		try {
			await target.send({
				embeds: [
					embed({
						category: Category.Owner,
						title: `A message from ${ctx.client.user?.username ?? "the bot"}`,
						description: content,
						footer: `Sent by ${ctx.user.username}`,
					}),
				],
			});
		} catch {
			throw new UserFacingError("I could not send them a direct message. Their DMs are probably closed.");
		}

		await ctx.reply({ embeds: [successEmbed(`Message delivered to ${target}.`)], ephemeral: true });
	},
});
