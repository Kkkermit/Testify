import { MessageFlags } from "discord.js";
import { DEFAULT_PREFIX } from "@config/constants";
import { theme } from "@config/theme";
import { defineCommand } from "@core/command";
import { UserFacingError } from "@core/errors";
import { getPrefix } from "@database/repositories/settingsRepository";
import { dashboardUrl } from "@lib/bot";
import { reply } from "@lib/discord";
import { choiceName, suggestionName, supportContext, supportDesk, supportScreen } from "@lib/support";
import { SUPPORT_LIMITS, supportQuestion, type SupportReply } from "@testify/shared";

/** An autocomplete choice's value is capped at 100 characters, so a longer question could not survive being picked. */
const QUESTION_MAX = 100;
/** A picked suggestion arrives as this plus the article's id, rather than as a question to search. */
const ARTICLE_CHOICE = "article:";
const CHOICES_MAX = 25;

export default defineCommand({
	name: "ask",
	description: "Answers questions about the bot, its dashboard, and setting it up.",
	category: "info",
	aliases: ["support", "faq"],
	cooldown: 5_000,
	options: [
		{
			name: "question",
			description: "What you want to know. Pick a suggestion or type your own.",
			type: "string",
			required: true,
			maxLength: QUESTION_MAX,
			autocomplete: true,
		},
	],

	async run(interaction, client) {
		const parsed = supportQuestion.safeParse({ question: interaction.options.getString("question", true) });
		if (!parsed.success) {
			throw new UserFacingError(
				`Ask in ${String(SUPPORT_LIMITS.questionMin)} to ${String(QUESTION_MAX)} characters of plain text.`,
			);
		}

		// Matching can call out to a model, which may take longer than Discord waits for a first reply.
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const prefix = interaction.guild === null ? DEFAULT_PREFIX : await getPrefix(interaction.guild.id);
		const help = supportContext(prefix);
		const desk = supportDesk(client);
		const { question } = parsed.data;

		const answer: SupportReply = question.startsWith(ARTICLE_CHOICE)
			? {
					answer: desk.article(question.slice(ARTICLE_CHOICE.length), help),
					related: desk.relatedTo(question.slice(ARTICLE_CHOICE.length), help),
				}
			: await desk.ask(question, help);

		await reply(
			interaction,
			supportScreen(answer, {
				bot: help.bot,
				ownerId: interaction.user.id,
				dashboard: dashboardUrl(client.env),
				supportServer: theme.supportServer,
			}),
		);
	},

	async autocomplete(interaction, client) {
		const typed = interaction.options.getFocused().slice(0, QUESTION_MAX);
		const links = supportDesk(client).suggest(typed, supportContext(DEFAULT_PREFIX), CHOICES_MAX);
		const choices = links.map((link) => ({ name: suggestionName(link), value: `${ARTICLE_CHOICE}${link.id}` }));

		// First, so pressing Enter asks exactly what was typed rather than opening the top suggestion.
		if (typed.trim().length >= SUPPORT_LIMITS.questionMin) {
			choices.unshift({ name: choiceName(`🔎 Ask: ${typed.trim()}`), value: typed.trim() });
		}

		await interaction.respond(choices.slice(0, CHOICES_MAX));
	},
});
