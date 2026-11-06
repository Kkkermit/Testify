import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, actorOf, guildOf } from "@api/context";
import { badRequest, forbidden } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { theme } from "@config/theme";
import { addToBlacklist } from "@database/repositories/blacklistRepository";
import { ownerLogChannel, postToLogChannel } from "@lib/bot";
import { embed } from "@lib/discord";
import { blacklistProblem } from "@lib/moderation";
import { programReport, runsAsProgram } from "@testify/shared";

/** Choosing a program or a script as a backup blacklists whoever chose it; the server judges the bytes itself. */
export const guildBackup = new Hono<ApiBindings>();

guildBackup.use("*", requireGuild);

guildBackup.post("/program", async (context) => {
	const { head } = await parseBody(context, programReport);
	if (!runsAsProgram(Uint8Array.from(head)))
		throw badRequest("Those bytes are not the start of a program or a script.");

	const client = context.get("client");
	const guild = guildOf(context);
	const actor = actorOf(context);
	// Nobody else can be named: the account blacklisted is the one this session signed in as.
	if (blacklistProblem(client, actor.id) !== null) return context.body(null, 204);

	const reason = `Chose a program or a script as a settings backup on the dashboard, in ${guild.name}.`;
	await addToBlacklist(actor.id, reason);
	await auditChange(context, {
		action: "blacklist.add",
		summary: `Blacklisted ${actor.name} for choosing a program or a script as a backup`,
		after: { userId: actor.id, reason },
	});
	client.logger.warn(
		{ userId: actor.id, guildId: guild.id },
		"[BACKUP] Blacklisted somebody who chose a program or a script as a backup.",
	);

	const channel = ownerLogChannel(client);
	if (channel !== undefined) {
		await postToLogChannel(client, channel, {
			embeds: [
				embed({
					colour: theme.colours.severe,
					title: "Blacklisted for choosing a program as a backup",
					description: `${actor.name} (\`${actor.id}\`) chose a program or a script on ${guild.name}'s (\`${guild.id}\`) Back up and copy page. Lift it with \`/blacklist remove\` if it was a mistake.`,
				}),
			],
			allowedMentions: { parse: [] },
		});
	}

	throw forbidden("blacklisted", "You are blocked from using this bot. You can still delete your data.");
});
