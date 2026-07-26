import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed, successEmbed } from "../../../ui/embeds";
import { requireQueue } from "../services/musicGuards";

const AVAILABLE = [
	"3d",
	"bassboost",
	"echo",
	"karaoke",
	"nightcore",
	"vaporwave",
	"flanger",
	"gate",
	"haas",
	"reverse",
	"surround",
	"mcompand",
	"phaser",
	"tremolo",
	"earwax",
];

export default defineCommand({
	name: "filters",
	description: "Adds, removes or clears audio filters.",
	category: Category.Music,
	surfaces: ["slash", "prefix"],
	aliases: ["filter", "fx"],
	guildOnly: true,
	options: [
		{
			name: "action",
			description: "What to do.",
			type: "string",
			required: true,
			choices: [
				{ name: "add", value: "add" },
				{ name: "remove", value: "remove" },
				{ name: "clear", value: "clear" },
				{ name: "list", value: "list" },
			],
		},
		{ name: "filter", description: "The filter name.", type: "string" },
	],

	async execute(ctx) {
		const { queue } = requireQueue(ctx);
		const action = ctx.options.getString("action", true);
		const filter = ctx.options.getString("filter")?.toLowerCase();

		switch (action) {
			case "clear":
				queue.filters.clear();
				await ctx.reply({ embeds: [successEmbed("All filters cleared.")] });
				return;
			case "list":
				await ctx.reply({
					embeds: [
						embed({
							category: Category.Music,
							title: "Audio filters",
							fields: [
								{ name: "Active", value: queue.filters.names.join(", ") || "None" },
								{ name: "Available", value: AVAILABLE.join(", ") },
							],
						}),
					],
				});
				return;
			case "add":
			case "remove": {
				if (filter === undefined) throw new UserFacingError("Name the filter you want to change.");
				if (!AVAILABLE.includes(filter)) {
					throw new UserFacingError(`Unknown filter. Available: ${AVAILABLE.join(", ")}.`);
				}

				if (action === "add") queue.filters.add(filter);
				else queue.filters.remove(filter);

				await ctx.reply({
					embeds: [successEmbed(`Filter \`${filter}\` ${action === "add" ? "enabled" : "disabled"}.`)],
				});
				return;
			}
			default:
				throw new UserFacingError("Pick `add`, `remove`, `clear` or `list`.");
		}
	},
});
