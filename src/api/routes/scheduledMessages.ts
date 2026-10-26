import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings, guildOf } from "@api/context";
import { notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { findSchedule } from "@database/repositories/scheduledMessageRepository";
import { addSchedule, changeSchedule, readSchedules, removeSchedule } from "@lib/scheduledMessages";
import { type ScheduledMessageInput, scheduledMessageInput, scheduledMessageParams } from "@testify/shared";

export const scheduledMessages = new Hono<ApiBindings>();

scheduledMessages.use("*", requireGuild);

const fieldsOf = (body: ScheduledMessageInput) => ({ ...body, nextAt: new Date(body.nextAt) });

async function existing(guildId: string, messageId: string): Promise<void> {
	if ((await findSchedule(guildId, messageId)) === null) {
		throw notFound(
			"scheduled_message_not_found",
			"That scheduled message has been deleted, or has already been posted.",
		);
	}
}

scheduledMessages.get("/", async (context) => context.json(await readSchedules(guildOf(context))));

/** Every write answers with the whole list, so the page shows what the server holds rather than what it sent. */
scheduledMessages.post("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, scheduledMessageInput);

	await addSchedule(guild, fieldsOf(body), context.get("session")?.userId ?? null);
	await auditChange(context, { action: "schedule.create", summary: `Scheduled a message in <#${body.channelId}>` });

	return context.json(await readSchedules(guild), 201);
});

scheduledMessages.put("/:messageId", async (context) => {
	const guild = guildOf(context);
	const { messageId } = parseParams(context, scheduledMessageParams);
	await existing(guild.id, messageId);
	const body = await parseBody(context, scheduledMessageInput);

	await changeSchedule(guild, messageId, fieldsOf(body), context.get("session")?.userId ?? null);
	await auditChange(context, {
		action: "schedule.update",
		summary: `Edited a scheduled message in <#${body.channelId}>`,
	});

	return context.json(await readSchedules(guild));
});

scheduledMessages.delete("/:messageId", async (context) => {
	const guild = guildOf(context);
	const { messageId } = parseParams(context, scheduledMessageParams);
	await existing(guild.id, messageId);

	await removeSchedule(guild, messageId);
	await auditChange(context, { action: "schedule.delete", summary: "Deleted a scheduled message" });

	return context.json(await readSchedules(guild));
});
