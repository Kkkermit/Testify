import { PermissionFlagsBits } from "discord.js";
import { asMember, defineCommand, inGuild, inTextChannel, type CommandInput, type CommandOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { attachHandMessage } from "@database/repositories/casinoRepository";
import { readCasinoStats } from "@database/repositories/casinoStatsRepository";
import {
	blackjackMessage,
	CASINO_COMMAND,
	CASINO_GAME_LABELS,
	CASINO_GAMES,
	CASINO_SETTINGS_SUBCOMMAND,
	CASINO_STATS_SUBCOMMAND,
	casinoStatsEmbed,
	casinoLobby,
	casinoSettingsPanel,
	coinflipOutcome,
	diceOutcome,
	hiloMessage,
	playInstant,
	readCasinoSettings,
	openingChip,
	openRound,
	rememberRoundMessage,
	roundBettingMessage,
	tableView,
	slotsOutcome,
	startBlackjack,
	startHiLoHand,
} from "@lib/casino";
import { reply } from "@lib/discord";
import { isCasinoGame } from "@testify/shared";

const AMOUNT: CommandOption = {
	name: "amount",
	description: "How much to bet: a number, `half` or `all`.",
	type: "string",
	required: true,
};

function playerOf(interaction: CommandInput): { guildId: string; userId: string } {
	return { guildId: inGuild(interaction).id, userId: interaction.user.id };
}

/** Remembers where a card hand is showing, so a hand left idle can be settled on the same message. */
async function rememberTable(
	interaction: CommandInput,
	hand: Parameters<typeof attachHandMessage>[0] | null,
): Promise<void> {
	if (hand === null || interaction.channel === null) return;

	const sent = await interaction.fetchReply();
	await attachHandMessage(hand, interaction.channel.id, sent.id);
}

export default defineCommand({
	name: CASINO_COMMAND,
	description: "Roulette, blackjack, slots and more, played with your wallet.",
	category: "casino",
	guildOnly: true,
	cooldown: 3_000,

	subcommands: [
		{
			name: "roulette",
			description: "Opens a roulette table. Public by default, so anybody in the channel can join.",
			aliases: ["roulette"],
			options: [
				{
					name: "table",
					description: "Public lets anybody in the channel bet; private keeps the table to you.",
					type: "string",
					choices: [
						{ name: "Public: anybody can join", value: "public" },
						{ name: "Private: only you", value: "private" },
					],
				},
			],
			async run(interaction) {
				const player = playerOf(interaction);
				const channel = inTextChannel(interaction);
				const chip = openingChip(await readCasinoSettings(player.guildId));
				const host = {
					userId: player.userId,
					name: asMember(interaction).displayName,
					private: interaction.options.getString("table") === "private",
				};

				const round = await openRound({ guildId: player.guildId, channelId: channel.id, messageId: null }, host, chip);
				if (round === null) throw new UserFacingError("Could not open a roulette table. Try again.");

				await reply(interaction, roundBettingMessage(await tableView(round)));
				await rememberRoundMessage(String(round._id), (await interaction.fetchReply()).id);
			},
		},
		{
			name: "blackjack",
			description: "Plays a hand of blackjack against the dealer.",
			aliases: ["blackjack", "bj"],
			options: [AMOUNT],
			async run(interaction) {
				const { view, hand } = await startBlackjack(
					playerOf(interaction),
					interaction.options.getString("amount", true),
				);
				await reply(interaction, blackjackMessage(view, interaction.user.id));
				await rememberTable(interaction, hand);
			},
		},
		{
			name: "slots",
			description: "Spins a three-reel slot machine.",
			aliases: ["slots"],
			options: [AMOUNT],
			async run(interaction, client) {
				await playInstant(
					interaction,
					client,
					playerOf(interaction),
					interaction.options.getString("amount", true),
					(stake) => slotsOutcome(stake),
				);
			},
		},
		{
			name: "hilo",
			description: "Calls each next card higher or lower, and cashes out whenever you like.",
			aliases: ["hilo"],
			options: [AMOUNT],
			async run(interaction) {
				const { view, hand } = await startHiLoHand(
					playerOf(interaction),
					interaction.options.getString("amount", true),
				);
				await reply(interaction, hiloMessage(view, interaction.user.id));
				await rememberTable(interaction, hand);
			},
		},
		{
			name: "coinflip",
			description: "Calls a coin toss.",
			aliases: ["coinflip", "gamble"],
			options: [
				AMOUNT,
				{
					name: "call",
					description: "Heads or tails.",
					type: "string",
					choices: [
						{ name: "Heads", value: "heads" },
						{ name: "Tails", value: "tails" },
					],
				},
			],
			async run(interaction, client) {
				const call = interaction.options.getString("call")?.toLowerCase() === "tails" ? "tails" : "heads";
				await playInstant(
					interaction,
					client,
					playerOf(interaction),
					interaction.options.getString("amount", true),
					(stake) => coinflipOutcome(call, stake),
				);
			},
		},
		{
			name: "dice",
			description: "Rolls two dice: bet under 7, over 7, or exactly 7.",
			aliases: ["dice"],
			options: [
				AMOUNT,
				{
					name: "bet",
					description: "Where the total lands.",
					type: "string",
					required: true,
					choices: [
						{ name: "Under 7", value: "under" },
						{ name: "Exactly 7", value: "seven" },
						{ name: "Over 7", value: "over" },
					],
				},
			],
			async run(interaction, client) {
				const bet = interaction.options.getString("bet", true).toLowerCase();
				if (bet !== "under" && bet !== "seven" && bet !== "over") {
					throw new UserFacingError("Bet `under`, `seven` or `over`.");
				}
				await playInstant(
					interaction,
					client,
					playerOf(interaction),
					interaction.options.getString("amount", true),
					(stake) => diceOutcome(bet, stake),
				);
			},
		},
		{
			name: "info",
			private: true,
			description: "Shows every game, what it pays, and this server's bet limits.",
			async run(interaction) {
				await reply(interaction, casinoLobby(await readCasinoSettings(inGuild(interaction).id)));
			},
		},
		{
			name: CASINO_STATS_SUBCOMMAND,
			description: "Shows what this server has gambled, won and lost, for the whole casino or one game.",
			options: [
				{
					name: "game",
					description: "One game's stats instead of the whole casino.",
					type: "string",
					choices: CASINO_GAMES.map((game) => ({ name: CASINO_GAME_LABELS[game], value: game })),
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const picked = interaction.options.getString("game");
				const game = picked !== null && isCasinoGame(picked) ? picked : null;
				const report = await readCasinoStats(guild.id, game, interaction.user.id);

				await reply(interaction, { embeds: [casinoStatsEmbed(report, { game, guildName: guild.name })] });
			},
		},
		{
			name: CASINO_SETTINGS_SUBCOMMAND,
			private: true,
			description: "Opens or closes the casino, switches games on and off, and sets the bet limits.",
			permissions: [PermissionFlagsBits.ManageGuild],
			async run(interaction) {
				await reply(
					interaction,
					casinoSettingsPanel(await readCasinoSettings(inGuild(interaction).id), interaction.user.id),
				);
			},
		},
	],
});
