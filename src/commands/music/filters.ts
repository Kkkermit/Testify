import { defineCommand } from "../../core/command";
import { UserFacingError } from "../../core/errors";
import { embed, successEmbed } from "../../lib/embeds";
import { requireQueue } from "../../lib/musicGuards";
import { reply } from "../../lib/reply";

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
	category: "music",
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

	async run(interaction, client) {
		const { queue } = requireQueue(interaction, client);
		const action = interaction.options.getString("action", true);
		const filter = interaction.options.getString("filter")?.toLowerCase();

		switch (action) {
			case "clear":
				queue.filters.clear();
				await reply(interaction, { embeds: [successEmbed("All filters cleared.")] });
				return;
			case "list":
				await reply(interaction, {
					embeds: [
						embed({
							category: "music",
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

				await reply(interaction, {
					embeds: [successEmbed(`Filter \`${filter}\` ${action === "add" ? "enabled" : "disabled"}.`)],
				});
				return;
			}
			default:
				throw new UserFacingError("Pick `add`, `remove`, `clear` or `list`.");
		}
	},
});
