import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { ApiProblem, badRequest, notFound, unauthorised } from "@api/errors";
import { requireAuth } from "@api/middleware/session";
import { parseBody, parseParams, parseQuery } from "@api/validate";
import { type DashboardSession } from "@database/models/dashboardSession.schema";
import { auditServersOf, auditsBy } from "@database/repositories/dashboardAuditRepository";
import { endOtherSessions, endSessionByHandle, sessionsFor } from "@database/repositories/dashboardSessionRepository";
import { deleteProfile, getProfile } from "@database/repositories/profileRepository";
import {
	cancelReminder,
	editReminder,
	findReminder,
	listReminders,
	setReminderDelivery,
	type StoredReminder,
} from "@database/repositories/reminderRepository";
import { type ProfileProblem, profileProblem, saveOwnProfile, toAccountProfile } from "@lib/info";
import { canPingHere } from "@lib/reminders";
import {
	ACCOUNT_LIMITS,
	type AccountHistory,
	accountHistoryQuery,
	type AccountReminder,
	type AccountProfile,
	type AccountSession,
	profileBody,
	reminderEditBody,
	reminderParams,
	reminderRouteSchema,
	reminderTimeProblem,
	sessionParams,
} from "@testify/shared";

/** What the person signed in has done and keeps, across every server; nothing here is ever about anybody else. */
export const account = new Hono<ApiBindings>();

account.use("*", requireAuth);

function sessionOf(context: Context<ApiBindings>): DashboardSession {
	const session = context.get("session");
	if (session === undefined) throw unauthorised();

	return session;
}

function guildNameOf(context: Context<ApiBindings>, guildId: string | null): string | null {
	return guildId === null ? null : (context.get("client").guilds.cache.get(guildId)?.name ?? null);
}

const PROFILE_REFUSALS: Record<ProfileProblem, string> = {
	profanity: "Take out the words that are not allowed.",
	birthday: "Pick a real date, no later than today.",
};

const reminderGone = () => notFound("reminder_not_found", "That reminder has already gone off or been cancelled.");

function toReminder(context: Context<ApiBindings>, reminder: StoredReminder): AccountReminder {
	return {
		id: reminder.id,
		text: reminder.text,
		dueAt: reminder.dueAt.toISOString(),
		deliver: reminder.deliver,
		canPing: canPingHere(reminder),
		guildId: reminder.guildId,
		guildName: guildNameOf(context, reminder.guildId),
	};
}

account.get("/history", async (context) => {
	const { userId } = sessionOf(context);
	const query = parseQuery(context, accountHistoryQuery);
	const perPage = ACCOUNT_LIMITS.historyPerPage;
	const [{ items, total }, servers] = await Promise.all([
		auditsBy(userId, query.page, perPage, query.server),
		auditServersOf(userId),
	]);

	const body: AccountHistory = {
		items: items.map((row) => ({
			id: row._id.toString(),
			at: row.at.toISOString(),
			guildId: row.guildId,
			guildName: guildNameOf(context, row.guildId),
			source: row.source === "command" ? "command" : "dashboard",
			summary: row.summary,
		})),
		total,
		page: query.page,
		perPage,
		servers: servers
			.filter((id): id is string => id !== null)
			.map((id) => ({ id, name: guildNameOf(context, id) }))
			.sort((a, b) => (a.name ?? "￿").localeCompare(b.name ?? "￿")),
	};

	return context.json(body);
});

account.get("/reminders", async (context) => {
	const reminders = await listReminders(sessionOf(context).userId);
	return context.json(reminders.map((reminder) => toReminder(context, reminder)));
});

account.put("/reminders/:reminderId/deliver", async (context) => {
	const { userId } = sessionOf(context);
	const { reminderId } = parseParams(context, reminderParams);
	const { deliver } = await parseBody(context, reminderRouteSchema);

	const reminder = await findReminder(userId, reminderId);
	if (reminder === null) throw reminderGone();
	if (deliver === "channel" && !canPingHere(reminder)) {
		throw badRequest("A reminder set in a direct message can only be delivered by one.");
	}

	const changed = await setReminderDelivery(userId, reminderId, deliver);
	if (changed === null) throw reminderGone();

	return context.json(toReminder(context, changed));
});

/** Not while it is being delivered, so an edit can never be sent half-applied or lost under the send. */
account.patch("/reminders/:reminderId", async (context) => {
	const { userId } = sessionOf(context);
	const { reminderId } = parseParams(context, reminderParams);
	const { text, dueAt } = await parseBody(context, reminderEditBody);

	const when = new Date(dueAt);
	const problem = reminderTimeProblem(when);
	if (problem !== null) throw new ApiProblem(400, problem, "Pick a time from a minute to a year from now.");

	const changed = await editReminder(userId, reminderId, { text, dueAt: when });
	if (changed === null) throw reminderGone();

	return context.json(toReminder(context, changed));
});

account.delete("/reminders/:reminderId", async (context) => {
	const { reminderId } = parseParams(context, reminderParams);
	if (!(await cancelReminder(sessionOf(context).userId, reminderId))) throw reminderGone();

	return context.body(null, 204);
});

account.get("/profile", async (context) => {
	const profile = await getProfile(sessionOf(context).userId);
	const body: { profile: AccountProfile | null } = { profile: profile === null ? null : toAccountProfile(profile) };

	return context.json(body);
});

/** The same rules `/profile set` keeps: its limits, its word filter and a real birthday. */
account.put("/profile", async (context) => {
	const { userId } = sessionOf(context);
	const fields = await parseBody(context, profileBody);

	const problem = profileProblem(fields);
	if (problem !== null) throw new ApiProblem(400, problem, PROFILE_REFUSALS[problem]);

	const body: { profile: AccountProfile } = { profile: toAccountProfile(await saveOwnProfile(userId, fields)) };
	return context.json(body);
});

account.delete("/profile", async (context) => {
	if (!(await deleteProfile(sessionOf(context).userId))) {
		throw notFound("profile_not_found", "You do not have a profile to delete.");
	}

	return context.body(null, 204);
});

account.get("/sessions", async (context) => {
	const session = sessionOf(context);
	const sessions = await sessionsFor(session.userId, session._id);
	const body: AccountSession[] = sessions.map((row) => ({
		id: row.handle,
		createdAt: row.createdAt.toISOString(),
		lastSeenAt: row.lastSeenAt.toISOString(),
		expiresAt: row.expiresAt.toISOString(),
		current: row.current,
	}));

	return context.json(body);
});

/** Registered before `/:sessionId`, so "others" is never read as a session. */
account.post("/sessions/others/end", async (context) => {
	const session = sessionOf(context);
	return context.json({ ended: await endOtherSessions(session.userId, session._id) });
});

/** The browser asking signs out from the sidebar, so this only ever ends one of the others. */
account.delete("/sessions/:sessionId", async (context) => {
	const session = sessionOf(context);
	const { sessionId } = parseParams(context, sessionParams);
	if (!(await endSessionByHandle(session.userId, sessionId, session._id))) {
		throw notFound("session_not_found", "That sign-in has already ended, or it is the one you are using now.");
	}

	return context.body(null, 204);
});
