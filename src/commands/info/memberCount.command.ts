import QuickChart from "quickchart-js";
import { defineCommand } from "@core/command";
import { ServiceError, UserFacingError } from "@core/errors";
import { embed, reply } from "@lib/discord";
import { formatNumber } from "@lib/format";
import { readMemberCounts } from "@lib/info";

export default defineCommand({
	name: "member-count",
	description: "Charts the member breakdown for this server.",
	category: "info",
	guildOnly: true,
	cooldown: 10_000,
	options: [
		{
			name: "chart-type",
			description: "How to display the chart.",
			type: "string",
			choices: [
				{ name: "bar", value: "bar" },
				{ name: "pie", value: "pie" },
				{ name: "doughnut", value: "doughnut" },
			],
		},
	],

	async run(interaction) {
		const guild = interaction.guild;
		if (!guild) throw new UserFacingError("This command only works inside a server.");

		await interaction.deferReply();

		const chartType = interaction.options.getString("chart-type") ?? "bar";
		const { total, people, bots, joinedDay, joinedWeek } = await readMemberCounts(guild);

		const chart = new QuickChart()
			.setConfig({
				type: chartType,
				data: {
					labels: ["Total", "People", "Bots", "Joined 24h", "Joined 7d"],
					datasets: [
						{
							label: "Members",
							data: [total, people, bots, joinedDay, joinedWeek],
							backgroundColor: ["#36a2eb", "#ffce56", "#ff6384", "#cc65fe", "#66ff99"],
						},
					],
				},
				options: { plugins: { title: { display: true, text: guild.name } } },
			})
			.setWidth(600)
			.setHeight(340)
			.setBackgroundColor("#151515");

		let url: string;
		try {
			url = await chart.getShortUrl();
		} catch (error) {
			throw new ServiceError("quickchart", error);
		}

		await reply(interaction, {
			embeds: [
				embed({
					category: "info",
					title: `Member count for ${guild.name}`,
					description: [
						`**Total** ${formatNumber(total)}`,
						`**People** ${formatNumber(people)}`,
						`**Bots** ${formatNumber(bots)}`,
						`**Joined in the last 24h** ${formatNumber(joinedDay)}`,
						`**Joined in the last 7 days** ${formatNumber(joinedWeek)}`,
					].join("\n"),
					image: url,
				}),
			],
		});
	},
});
