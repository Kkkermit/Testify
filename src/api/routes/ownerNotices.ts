import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { type ApiBindings } from "@api/context";
import { requireOwner } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { allNotices, changeNotice, postNotice, readNotice, removeNotice } from "@lib/notices";
import { noticeInput, noticeParams, noticePatch } from "@testify/shared";

/** The same three actions `/bot-notifications` gives the bot's owners, on the same store. */
export const ownerNotices = new Hono<ApiBindings>();

ownerNotices.use("*", requireOwner);

ownerNotices.get("/", async (context) => context.json(await allNotices()));

ownerNotices.post("/", async (context) => {
	const input = await parseBody(context, noticeInput);
	const notice = await postNotice(input, context.get("session")?.userId ?? "");

	await auditChange(context, {
		action: "notice.post",
		summary: `Posted the notification "${notice.title}"`,
		after: notice,
	});
	return context.json(notice, 201);
});

ownerNotices.patch("/:noticeId", async (context) => {
	const { noticeId } = parseParams(context, noticeParams);
	const patch = await parseBody(context, noticePatch);
	const before = await readNotice(noticeId);
	const notice = await changeNotice(noticeId, patch);

	await auditChange(context, {
		action: "notice.update",
		summary:
			patch.notifyAgain === true
				? `Told everybody again about "${notice.title}"`
				: `Changed the notification "${notice.title}"`,
		before,
		after: notice,
	});
	return context.json(notice);
});

ownerNotices.delete("/:noticeId", async (context) => {
	const { noticeId } = parseParams(context, noticeParams);
	const before = await readNotice(noticeId);
	await removeNotice(noticeId);

	await auditChange(context, {
		action: "notice.remove",
		summary: `Removed the notification "${before.title}"`,
		before,
	});
	return context.body(null, 204);
});
