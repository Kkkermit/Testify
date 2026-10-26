import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf, readerOf } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { deleteTicketSetup } from "@database/repositories/ticketRepository";
import { applyTickets, closeTicketFrom, normaliseTicketSetup, readOpenTickets, readTickets } from "@lib/tickets";
import { openTicketParams, ticketPatch } from "@testify/shared";

export const tickets = new Hono<ApiBindings>();

tickets.use("*", requireGuild);

tickets.get("/", async (context) => context.json(await readTickets(guildOf(context))));

tickets.patch("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, ticketPatch);

	const result = await applyTickets(guild, body, guild.roles.everyone.id);
	if ("problem" in result) throw badRequest(result.problem);

	await auditChange(context, {
		action: body.publish === true ? "tickets.publish" : "tickets.update",
		summary: body.publish === true ? "Posted the ticket panel" : "Changed the ticket settings",
	});

	return context.json(result.settings);
});

/** Existing ticket channels are left alone, so turning the system off never deletes somebody's open thread. */
tickets.delete("/", async (context) => {
	const guild = guildOf(context);

	if (!(await deleteTicketSetup(guild.id))) throw notFound("tickets_not_found", "Tickets were not set up here.");
	await auditChange(context, { action: "tickets.disable", summary: "Turned the ticket system off" });

	return context.json(normaliseTicketSetup(null));
});

tickets.get("/open", async (context) =>
	context.json(await readOpenTickets(context.get("client"), guildOf(context), readerOf(context))),
);

/** The closer is named in the transcript, so it is the person signed in, fetched as Discord knows them. */
tickets.post("/open/:channelId/close", async (context) => {
	const guild = guildOf(context);
	const { channelId } = parseParams(context, openTicketParams);
	const client = context.get("client");
	const closer = await client.users.fetch(actorOf(context).id).catch(() => null);
	if (closer === null) throw notFound("user_not_found", "Discord does not know your account right now. Try again.");

	await closeTicketFrom(client, guild, channelId, closer, readerOf(context));
	await auditChange(context, { action: "tickets.close", summary: "Closed a ticket", after: { channelId } });

	return context.json(await readOpenTickets(client, guild, readerOf(context)));
});
