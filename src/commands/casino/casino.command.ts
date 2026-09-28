import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild, type CommandInput, type CommandOption } from "@core/command";
import { UserFacingError } from "@core/errors";
import { attachHandMessage } from "@database/repositories/casinoRepository";
import { requireAccount } from "@database/repositories/economyRepository";
import {
	blackjackMessage,
	CASINO_COMMAND,
	CASINO_SETTINGS_SUBCOMMAND,
	casinoLobby,
	casinoSettingsPanel,
	coinflipOutcome,
	diceOutcome,
	hiloMessage,
	isRouletteBetKind,
	playInstant,
	readCasinoSettings,
	ROULETTE_BET_LABELS,
	ROULETTE_BETS,
	rouletteOutcome,
	rouletteTableMessage,
	type RouletteBet,
	slotsOutcome,
	startBlackjack,
	startHiLoHand,
} from "@lib/casino";
import { reply } from "@lib/discord";
import { resolveAmount } from "@lib/format";

const AMOUNT: CommandOption = {
	name: "amount",
	description: "How much to bet: a number, `half` or `all`.",
	type: "string",
	required: true,
};

function playerOf(interaction: CommandInput): { guildId: string; userId: string } {
	return { guildId: inGuild(interaction).id, userId: interaction.user.id };
}

/** A prefix player can name a number straight away, `t?casino roulette 100 17`, as well as `number 17`. */
function rouletteBetOf(interaction: CommandInput, given: string): RouletteBet {
	const raw = given.trim().toLowerCase();
	const picked = interaction.options.getInteger("number");
	const direct = /^\d{1,2}$/.test(raw) ? Number.parseInt(raw, 10) : null;

	if (direct !== null || raw === "number") {
		const pocket = direct ?? picked;
		if (pocket === null || pocket < 0 || pocket > 36) {
			throw new UserFacingError("A single-number bet needs a `number` from 0 to 36.");
		}
		return { kind: "number", number: pocket };
	}

	if (!isRouletteBetKind(raw)) throw new UserFacingError("Pick a bet from the list, or a number from 0 to 36.");

	return { kind: raw };
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
			description: "Bets on where the ball lands on a single-zero wheel.",
			aliases: ["roulette"],
			options: [
				AMOUNT,
				{
					name: "bet",
					description: "One bet to spin straight away. Leave it out to open the table and place several.",
					type: "string",
					choices: ROULETTE_BETS.map((kind) => ({ name: ROULETTE_BET_LABELS[kind], value: kind })),
				},
				{ name: "number", description: "The number, for a single-number bet.", type: "integer", min: 0, max: 36 },
			],
			async run(interaction, client) {
				const player = playerOf(interaction);
				const amount = interaction.options.getString("amount", true);
				const given = interaction.options.getString("bet");

				if (given === null) {
					const chip = resolveAmount(amount, (await requireAccount(player.guildId, player.userId)).wallet);
					await reply(interaction, rouletteTableMessage({ bets: [], chip }, player.userId));
					return;
				}

				const bet = rouletteBetOf(interaction, given);
				await playInstant(interaction, client, player, amount, (stake) => rouletteOutcome([bet], stake));
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
