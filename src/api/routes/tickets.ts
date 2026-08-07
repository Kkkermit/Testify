import { type Guild } from "discord.js";
import { type Context, Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { badRequest, notFound } from "@api/errors";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { deleteTicketSetup } from "@database/repositories/ticketRepository";
import { applyTickets, normaliseTicketSetup, readTickets } from "@lib/ticketActions.util";
import { ticketPatch } from "@testify/shared";

export const tickets = new Hono<ApiBindings>();

tickets.use("*", requireGuild);

function guildOf(context: Context<ApiBindings>): Guild {
	const guild = context.get("guild");
	if (guild === undefined) throw notFound("guild_not_found", "Testify is not in that server.");

	return guild;
}

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
