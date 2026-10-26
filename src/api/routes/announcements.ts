import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf, readerOf } from "@api/context";
import { forbidden } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { announcementMessage, mentionProblem, sendableChannel } from "@lib/moderation";
import { type AnnouncementSent, announcementBody } from "@testify/shared";

export const announcements = new Hono<ApiBindings>();

// `/announce` and `/say` ask for Manage Server, which `requireGuild` already insists on.
announcements.use("*", requireGuild);

announcements.post("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, announcementBody);
	const channel = sendableChannel(guild, body.channelId);

	const reader = readerOf(context);
	const problem = mentionProblem(channel, guild, reader, body.mentions);
	if (problem !== null) throw forbidden("cannot_mention", problem);

	const sent = await channel.send(
		announcementMessage({
			style: body.style,
			title: body.title,
			message: body.message,
			colour: body.colour,
			mentions: body.mentions,
			by: { name: actorOf(context).name, avatarUrl: reader?.displayAvatarURL() ?? null },
		}),
	);

	await auditChange(context, {
		action: "announcement.post",
		summary: `Posted ${body.mentions === "none" ? "an announcement" : `an announcement pinging @${body.mentions}`} in #${channel.name}`,
		after: { style: body.style, mentions: body.mentions },
	});

	const answer: AnnouncementSent = { channelId: channel.id, url: sent.url };
	return context.json(answer);
});
