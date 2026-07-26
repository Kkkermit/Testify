import QuickChart from "quickchart-js";
import { DAY_MS, WEEK_MS } from "../../../config/constants";
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { ExternalApiError, UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";
import { formatNumber } from "../../../ui/format";

export default defineCommand({
	name: "member-count",
	description: "Charts the member breakdown for this server.",
	category: Category.Info,
	surfaces: ["slash", "prefix"],
	aliases: ["membercount", "members"],
	guildOnly: true,
	cooldownMs: 10_000,
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

	async execute(ctx) {
		const guild = ctx.guild;
		if (!guild) throw new UserFacingError("This command only works inside a server.");

		await ctx.defer();
		await guild.members.fetch().catch(() => null);

		const chartType = ctx.options.getString("chart-type") ?? "bar";
		const now = Date.now();
		const total = guild.memberCount;
		const bots = guild.members.cache.filter((member) => member.user.bot).size;
		const humans = total - bots;
		const joinedIn = (window: number): number =>
			guild.members.cache.filter((member) => member.joinedTimestamp !== null && now - member.joinedTimestamp < window)
				.size;

		const last24h = joinedIn(DAY_MS);
		const last7d = joinedIn(WEEK_MS);

		const chart = new QuickChart()
			.setConfig({
				type: chartType,
				data: {
					labels: ["Total", "People", "Bots", "Joined 24h", "Joined 7d"],
					datasets: [
						{
							label: "Members",
							data: [total, humans, bots, last24h, last7d],
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
			throw new ExternalApiError("quickchart", error);
		}

		await ctx.reply({
			embeds: [
				embed({
					category: Category.Info,
					title: `Member count for ${guild.name}`,
					description: [
						`**Total** ${formatNumber(total)}`,
						`**People** ${formatNumber(humans)}`,
						`**Bots** ${formatNumber(bots)}`,
						`**Joined in the last 24h** ${formatNumber(last24h)}`,
						`**Joined in the last 7 days** ${formatNumber(last7d)}`,
					].join("\n"),
					image: url,
				}),
			],
		});
	},
});
