import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, guildOf, readerOf } from "@api/context";
import { forbidden, tooManyRequests } from "@api/errors";
import { RateLimiter } from "@api/middleware/rateLimit";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { MINUTE_MS } from "@config/constants";
import { strings } from "@config/strings";
import { sendTestPost } from "@lib/settings";
import { TEST_POST_LIMITS, testPostBody } from "@testify/shared";

export const testPost = new Hono<ApiBindings>();

testPost.use("*", requireGuild);

/** Keyed by server and person, so a test in one server never holds up one in another. */
export const testPostLimiter = new RateLimiter({ limit: TEST_POST_LIMITS.perMinute, windowMs: MINUTE_MS });

/** The draft goes to the person asking and to nobody else; there is no recipient to choose. */
testPost.post("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, testPostBody);

	// An owner skips the member fetch in `requireGuild`, but may still be in the server.
	const reader = readerOf(context) ?? (await guild.members.fetch(actorOf(context).id).catch(() => null));
	if (reader === null) throw forbidden("not_a_member", strings.testPost.notAMember);

	const verdict = testPostLimiter.check(`${guild.id}:${reader.id}`);
	if (!verdict.allowed) throw tooManyRequests(Math.ceil(verdict.retryAfterMs / 1000));

	if ((await sendTestPost(body, reader)) === "closed") throw forbidden("dm_closed", strings.testPost.dmClosed);
	await auditChange(context, {
		action: "test.send",
		summary: `Sent themselves a test of ${strings.testPost.what[body.kind]}`,
		after: { kind: body.kind },
	});

	return context.body(null, 204);
});
