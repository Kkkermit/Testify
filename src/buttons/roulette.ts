import { MessageFlags } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { checkCasinoPlay, refusalText } from "@core/checks";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	changeChip,
	chipChosenLine,
	clearMyBets,
	openRound,
	parseNumbers,
	placeBets,
	refundLine,
	ROULETTE_ID,
	roundBettingMessage,
	tableView,
	type Seat,
	spinNow,
	spotFromKey,
} from "@lib/casino";
import { modalForm } from "@lib/discord";

/** A shared roulette round: anybody in the channel may bet, each through the same gates as the command. */

function seatOf(interaction: ComponentInteraction): Seat | null {
	if (interaction.guildId === null) return null;
	const member = interaction.member;
	const name =
		member !== null && "displayName" in member && typeof member.displayName === "string"
			? member.displayName
			: (interaction.user.globalName ?? interaction.user.username);

	return { guildId: interaction.guildId, userId: interaction.user.id, name };
}

async function admit(client: TestifyClient, seat: Seat): Promise<void> {
	const refused = await checkCasinoPlay(client, seat, "roulette");
	if (refused !== null) throw new UserFacingError(refusalText(refused));
}

export default defineButton({
	id: ROULETTE_ID,

	async run(interaction, context) {
		const seat = seatOf(interaction);
		if (seat === null) return;
		const [roundId = "", spot] = context.args;

		switch (context.action) {
			case "bet": {
				if (!interaction.isButton()) return;
				const bet = spot === undefined ? null : spotFromKey(spot);
				if (bet === null) return;

				await admit(context.client, seat);
				const round = await placeBets(context.client, seat, roundId, [bet]);
				await interaction.update(roundBettingMessage(await tableView(round)));
				return;
			}

			case "num":
				if (!interaction.isButton()) return;
				await interaction.showModal(
					modalForm({
						id: ROULETTE_ID,
						action: "numset",
						args: [roundId],
						title: "Bet on numbers",
						fields: [
							{
								id: "numbers",
								label: "Which numbers? One chip on each.",
								placeholder: "e.g. 17, or 7 17 32",
								maxLength: 60,
							},
						],
					}),
				);
				return;

			case "numset": {
				if (!interaction.isModalSubmit() || !interaction.isFromMessage()) return;
				const numbers = parseNumbers(interaction.fields.getTextInputValue("numbers"));
				if (numbers === null) throw new UserFacingError("Give numbers from 0 to 36, like `17` or `7 17 32`.");

				await admit(context.client, seat);
				const round = await placeBets(
					context.client,
					seat,
					roundId,
					numbers.map((number) => ({ kind: "number", number })),
				);
				await interaction.update(roundBettingMessage(await tableView(round)));
				return;
			}

			case "chip":
				if (!interaction.isButton()) return;
				await interaction.showModal(
					modalForm({
						id: ROULETTE_ID,
						action: "chipset",
						args: [roundId],
						title: "Change your chip",
						fields: [{ id: "chip", label: "How much is each of your chips?", placeholder: "e.g. 250, half or all" }],
					}),
				);
				return;

			case "chipto":
			case "chipset": {
				const amount =
					context.action === "chipto"
						? spot
						: interaction.isModalSubmit()
							? interaction.fields.getTextInputValue("chip")
							: undefined;
				if (amount === undefined) return;
				const { chip, wallet } = await changeChip(seat, roundId, amount);
				await interaction.reply({ content: chipChosenLine(chip, wallet), flags: MessageFlags.Ephemeral });
				return;
			}

			case "spin": {
				if (!interaction.isButton()) return;
				// The spin edits the message through the channel, so the press is only acknowledged here.
				await interaction.deferUpdate();
				await spinNow(context.client, seat, roundId);
				return;
			}

			case "clear": {
				if (!interaction.isButton()) return;
				const { round, refunded } = await clearMyBets(seat, roundId);
				await interaction.update(roundBettingMessage(await tableView(round)));
				await interaction.followUp({ content: refundLine(refunded), flags: MessageFlags.Ephemeral });
				return;
			}

			case "again": {
				if (!interaction.isButton()) return;
				const chip = Number(roundId);
				const [, access, hostId] = context.args;
				if (!Number.isSafeInteger(chip) || chip <= 0) return;
				const isPrivate = access === "private";
				if (isPrivate && hostId !== seat.userId) {
					throw new UserFacingError("That was a private table. Open your own with `/casino roulette`.");
				}

				await admit(context.client, seat);
				// On the message the button sits on, so the channel keeps one table rather than a stack of them.
				const round = await openRound(
					{ guildId: seat.guildId, channelId: interaction.channelId, messageId: interaction.message.id },
					{ userId: seat.userId, name: seat.name, private: isPrivate },
					chip,
				);
				if (round === null) throw new UserFacingError("A new round is already starting here.");
				await interaction.update(roundBettingMessage(await tableView(round)));
				return;
			}

			default:
				return;
		}
	},
});
