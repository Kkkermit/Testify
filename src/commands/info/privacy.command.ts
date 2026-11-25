import { SECOND_MS } from "@config/constants";
import { defineCommand } from "@core/command";
import { type AnalyticsChoice, analyticsChoice, chooseAnalytics, eraseAnalytics, siteUrl } from "@lib/bot";
import { embed, reply, successEmbed } from "@lib/discord";

const SENT: Record<AnalyticsChoice["sending"], string> = {
	off: "The bot isn't sending usage analytics anywhere right now. If it starts, it will keep to the choice below.",
	identified:
		"When you use a command, button, menu or form, the bot sends which one, when, in which server and whether it worked to an analytics service its owners run. Your Discord user ID, username and picture go with it, kept encrypted for at most 90 days, so the owners can look into problems and abuse.",
	hashed:
		"When you use a command, button, menu or form, the bot sends which one, when, in which server and whether it worked to an analytics service its owners run. In place of your user ID it sends a code that changes regularly and can't be traced back to you.",
};

export function privacyEmbed(choice: AnalyticsChoice, policyUrl: string | null) {
	const lines = [
		SENT[choice.sending],
		"It never sends your messages or anything you type into a command.",
		"",
		choice.optedOut
			? "**You're opted out**, so nothing you do is sent. `/privacy opt-in` turns it back on."
			: "Opt out any time with `/privacy opt-out`. `/privacy erase` also deletes what was already sent.",
		"",
		"This covers the usage analytics only. What servers keep through the bot's features, like levels or warnings, is covered by `/delete-my-data`.",
	];
	if (policyUrl !== null) lines.push("", `The privacy notice: ${policyUrl}`);
	return embed({ category: "info", title: "Usage analytics", description: lines.join("\n") });
}

const ERASED = {
	erased:
		"Deleted what the usage analytics held about you, and you're opted out from now on. Anything they can no longer link to you expires on its own.",
	failed:
		"You're opted out from now on, but the analytics service couldn't be reached to delete what it already holds. Run `/privacy erase` again later.",
	off: "You're opted out. The bot isn't sending usage analytics anywhere right now, so there was nothing to delete.",
} as const;

export default defineCommand({
	name: "privacy",
	description: "Shows what the bot's usage analytics record about you, and lets you opt out.",
	category: "info",
	private: true,
	cooldown: 5 * SECOND_MS,
	subcommands: [
		{
			name: "info",
			description: "Shows what the usage analytics record about you, and whether you're opted out.",
			async run(interaction, client) {
				const site = siteUrl(client.env);
				const policy = site === null ? null : `${site.replace(/\/$/, "")}/privacy`;
				await reply(interaction, {
					embeds: [privacyEmbed(await analyticsChoice(client, interaction.user.id), policy)],
				});
			},
		},
		{
			name: "opt-out",
			description: "Stops sending anything you do with the bot to its usage analytics.",
			async run(interaction, client) {
				await chooseAnalytics(client, interaction.user.id, true);
				await reply(interaction, {
					embeds: [
						successEmbed(
							"Done. Nothing you do with the bot is sent to its usage analytics any more. `/privacy opt-in` turns it back on.",
						),
					],
				});
			},
		},
		{
			name: "opt-in",
			description: "Counts your use of the bot in its usage analytics again.",
			async run(interaction, client) {
				await chooseAnalytics(client, interaction.user.id, false);
				await reply(interaction, {
					embeds: [successEmbed("Thanks. Your use of the bot is counted in its usage analytics again.")],
				});
			},
		},
		{
			name: "erase",
			description: "Deletes what the usage analytics hold about you, and opts you out.",
			async run(interaction, client) {
				await interaction.deferReply();
				const outcome = await eraseAnalytics(client, interaction.user.id);
				await reply(interaction, { embeds: [successEmbed(ERASED[outcome])] });
			},
		},
	],
});
