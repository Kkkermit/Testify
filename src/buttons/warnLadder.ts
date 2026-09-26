import { type GuildMember, PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { readWarnLadder, stepLabel, WARN_LADDER_ID, warnLadderPanel, writeWarnLadder } from "@lib/moderation";
import { stepFromValue, WARN_LIMITS, type WarnStep } from "@testify/shared";

/** The `/warn punishments` panel: every change is written at once, against a fresh read of the list. */

const STALE = "That step has changed since this panel was drawn. Open it again with `/warn punishments`.";

export default defineButton({
	id: WARN_LADDER_ID,
	ownerOnly: true,

	async run(interaction, { action, args }) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isMessageComponent()) return;

		// Re-checked on every press, because the panel outlives the permission it was opened with.
		if (!(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageGuild)) {
			throw new UserFacingError("You need the Manage Server permission to change warning punishments.");
		}

		const { steps } = await readWarnLadder(guild.id);
		let next: WarnStep[];
		let note: string;

		if (action === "set") {
			if (!interaction.isStringSelectMenu()) return;

			const index = Number(args[0]);
			const step = stepFromValue(interaction.values[0] ?? "");
			if (step === null || !Number.isInteger(index) || index < 0 || index >= steps.length) {
				throw new UserFacingError(STALE);
			}

			next = steps.map((current, at) => (at === index ? step : current));
			note = `Warning ${String(index + 1)} now means: ${stepLabel(step)}.`;
		} else if (action === "add") {
			if (steps.length >= WARN_LIMITS.maxSteps) {
				throw new UserFacingError(`A server can set up to ${String(WARN_LIMITS.maxSteps)} steps.`);
			}

			next = [...steps, { action: "warn" }];
			note = `Added warning ${String(next.length)}. Pick what it does from its menu.`;
		} else if (action === "pop") {
			if (steps.length === 0) throw new UserFacingError(STALE);

			next = steps.slice(0, -1);
			note = `Removed warning ${String(steps.length)}.`;
		} else {
			return;
		}

		const saved = await writeWarnLadder(guild.id, next, interaction.user.id);
		await interaction.update(warnLadderPanel(saved, interaction.user.id, note));
	},
});
