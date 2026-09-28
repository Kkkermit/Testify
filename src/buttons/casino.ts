import { type MessageComponentInteraction, type ModalSubmitInteraction } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { checkCasinoPlay, refusalText } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { attachHandMessage, type HandRecord } from "@database/repositories/casinoRepository";
import { requireAccount } from "@database/repositories/economyRepository";
import {
	blackjackMessage,
	callHiLo,
	CASINO_ID,
	cashOutHiLo,
	decodeSpots,
	hiloMessage,
	isInstantGame,
	outcomeFor,
	playBlackjack,
	playInstant,
	type Player,
	rouletteAgainBets,
	type RouletteBet,
	rouletteOutcome,
	type RouletteTable,
	rouletteTableMessage,
	spotFromKey,
	spotGroup,
	startBlackjack,
	startHiLoHand,
} from "@lib/casino";
import { modalForm } from "@lib/discord";
import { formatNumber, resolveAmount } from "@lib/format";
import { type CasinoGame, isCasinoGame } from "@testify/shared";

const stale = (): UserFacingError =>
	new UserFacingError("That button no longer knows what it was for. Start a new game.");

/** Every new game passes the gates the command does, not only the ones the old message was sent through. */
async function admit(client: TestifyClient, player: Player, game: CasinoGame): Promise<void> {
	const refused = await checkCasinoPlay(client, player, game);
	if (refused !== null) throw new UserFacingError(refusalText(refused));
}

function tableFrom(mask: string | undefined, chip: string | undefined): RouletteTable {
	const bets = mask === undefined ? null : decodeSpots(mask);
	const amount = chip === undefined ? Number.NaN : Number(chip);
	if (bets === null || !Number.isSafeInteger(amount) || amount <= 0) throw stale();

	return { bets, chip: amount };
}

/** Play again on the same message: roulette reopens its table with the last bets still on it, the rest deal again. */
async function playAgain(
	interaction: MessageComponentInteraction,
	client: TestifyClient,
	player: Player,
	args: readonly string[],
): Promise<void> {
	const [game, call, stake] = args;
	if (game === undefined || call === undefined || stake === undefined || !isCasinoGame(game)) return;

	await admit(client, player, game);

	if (game === "roulette") {
		const bets = rouletteAgainBets(call);
		const chip = Number(stake);
		if (bets === null || !Number.isSafeInteger(chip) || chip <= 0) throw stale();
		await interaction.update(rouletteTableMessage({ bets, chip }, player.userId));
		return;
	}

	if (isInstantGame(game)) {
		await interaction.deferUpdate();
		await playInstant(interaction, client, player, stake, (bet) => {
			const outcome = outcomeFor(game, call, bet);
			if (outcome === null) throw stale();
			return outcome;
		});
		return;
	}

	let hand: HandRecord | null;
	if (game === "blackjack") {
		const started = await startBlackjack(player, stake);
		hand = started.hand;
		await interaction.update(blackjackMessage(started.view, player.userId));
	} else {
		const started = await startHiLoHand(player, stake);
		hand = started.hand;
		await interaction.update(hiloMessage(started.view, player.userId));
	}

	if (hand !== null) await attachHandMessage(hand, interaction.channelId, interaction.message.id);
}

/** One menu covers one part of the layout, so its answer replaces that part and leaves the others alone. */
async function pickSpots(interaction: ComponentInteraction, player: Player, args: readonly string[]): Promise<void> {
	if (!interaction.isStringSelectMenu()) return;

	const [group, mask, chip] = args;
	const table = tableFrom(mask, chip);
	const picked = interaction.values
		.map(spotFromKey)
		.filter((spot): spot is RouletteBet => spot !== null && spotGroup(spot) === group);
	const kept = table.bets.filter((bet) => spotGroup(bet) !== group);

	await interaction.update(rouletteTableMessage({ ...table, bets: [...kept, ...picked] }, player.userId));
}

async function spin(
	interaction: MessageComponentInteraction,
	client: TestifyClient,
	player: Player,
	args: readonly string[],
): Promise<void> {
	const [mask, chip] = args;
	const table = tableFrom(mask, chip);
	if (table.bets.length === 0) throw new UserFacingError("Put a chip on the table first.");

	await admit(client, player, "roulette");
	await interaction.deferUpdate();
	await playInstant(interaction, client, player, String(table.chip * table.bets.length), (stake) =>
		rouletteOutcome(table.bets, stake),
	);
}

async function setChip(interaction: ModalSubmitInteraction, player: Player, args: readonly string[]): Promise<void> {
	const [mask] = args;
	const bets = mask === undefined ? null : decodeSpots(mask);
	if (bets === null || !interaction.isFromMessage()) throw stale();

	const account = await requireAccount(player.guildId, player.userId);
	const chip = resolveAmount(interaction.fields.getTextInputValue("chip"), account.wallet);

	await interaction.update(
		rouletteTableMessage({ bets, chip }, player.userId, `Each chip is now ${formatNumber(chip)}.`),
	);
}

export default defineButton({
	id: CASINO_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guildId === null) return;

		const player = { guildId: interaction.guildId, userId: interaction.user.id };

		if (interaction.isModalSubmit()) {
			if (context.action === "rt-chipset") await setChip(interaction, player, context.args);
			return;
		}

		switch (context.action) {
			case "rt-pick":
				await pickSpots(interaction, player, context.args);
				return;
			case "rt-spin":
				await spin(interaction, context.client, player, context.args);
				return;
			case "rt-clear": {
				const [chip] = context.args;
				await interaction.update(rouletteTableMessage(tableFrom("0", chip), player.userId));
				return;
			}
			case "rt-chip": {
				const [mask] = context.args;
				if (mask === undefined || decodeSpots(mask) === null) throw stale();
				await interaction.showModal(
					modalForm({
						id: CASINO_ID,
						action: "rt-chipset",
						args: [mask, player.userId],
						title: "Change your chip",
						fields: [{ id: "chip", label: "How much on each spot?", placeholder: "e.g. 100, half or all" }],
					}),
				);
				return;
			}
		}

		if (!interaction.isButton()) return;

		switch (context.action) {
			case "again":
				await playAgain(interaction, context.client, player, context.args);
				return;
			case "bj-hit":
			case "bj-stand":
			case "bj-double": {
				const action = context.action === "bj-hit" ? "hit" : context.action === "bj-stand" ? "stand" : "double";
				await interaction.update(blackjackMessage(await playBlackjack(player, action), player.userId));
				return;
			}
			case "hl-higher":
			case "hl-lower":
				await interaction.update(
					hiloMessage(await callHiLo(player, context.action === "hl-higher" ? "higher" : "lower"), player.userId),
				);
				return;
			case "hl-cash":
				await interaction.update(hiloMessage(await cashOutHiLo(player), player.userId));
				return;
			default:
				return;
		}
	},
});
