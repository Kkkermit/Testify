import { Hono } from "hono";
import { type ApiBindings, actorOf, guildOf } from "@api/context";
import { badRequest } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { theme } from "@config/theme";
import { AttemptThrottle, ownerLogChannel, postToLogChannel } from "@lib/bot";
import { embed } from "@lib/discord";
import { programReport, runsAsProgram } from "@testify/shared";

/**
 * A program or a script chosen as a backup is refused in the browser and reported here, judged on its bytes again. It
 * blocks nobody, because somebody can be talked into choosing one; the owners are told who chose it, and decide.
 */
export const guildBackup = new Hono<ApiBindings>();

let reports = new AttemptThrottle();

export function clearProgramReports(): void {
	reports = new AttemptThrottle();
}

guildBackup.use("*", requireGuild);

guildBackup.post("/program", async (context) => {
	const { head } = await parseBody(context, programReport);
	if (!runsAsProgram(Uint8Array.from(head)))
		throw badRequest("Those bytes are not the start of a program or a script.");

	const client = context.get("client");
	const guild = guildOf(context);
	// Nobody else can be named: the account reported is the one this session signed in as.
	const actor = actorOf(context);
	const held = reports.admit(`${guild.id}:${actor.id}`, Date.now());
	if (held === null) return context.body(null, 204);

	client.logger.warn(
		{ userId: actor.id, guildId: guild.id },
		"[BACKUP] Somebody chose a program or a script as a backup. Nothing in it was opened or run.",
	);

	const channel = ownerLogChannel(client);
	if (channel !== undefined) {
		await postToLogChannel(client, channel, {
			embeds: [
				embed({
					colour: theme.colours.severe,
					title: "⚠️ A program was chosen as a backup",
					description:
						"They chose a program or a script on the dashboard's Back up and copy page. Nothing in it was opened or run, and nothing was blocked: somebody may have talked them into it.",
					fields: [
						{ name: "Account", value: `${actor.name} (\`${actor.id}\`)`, inline: true },
						{ name: "Server", value: `${guild.name} (\`${guild.id}\`)`, inline: true },
						...(held > 0 ? [{ name: "Held back", value: `${String(held)} more in the minute before this` }] : []),
					],
					footer: "Block them with /blacklist add only if it looks deliberate.",
				}),
			],
			allowedMentions: { parse: [] },
		});
	}

	return context.body(null, 204);
});
