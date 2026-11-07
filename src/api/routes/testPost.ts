import { Hono } from "hono";
import { auditChange } from "@api/audit";
import { actorOf, type ApiBindings, areasOf, guildOf, readerOf } from "@api/context";
import { featureOff, forbidden, tooManyRequests } from "@api/errors";
import { RateLimiter } from "@api/middleware/rateLimit";
import { requireGuild } from "@api/middleware/session";
import { parseBody } from "@api/validate";
import { MINUTE_MS } from "@config/constants";
import { strings } from "@config/strings";
import { sendTestPost } from "@lib/settings";
import { type AccessArea, screenIsOff, TEST_POST_LIMITS, type TestPost, testPostBody } from "@testify/shared";

export const testPost = new Hono<ApiBindings>();

testPost.use("*", requireGuild);

/** The screens each kind of test is sent from, so somebody given one screen cannot draft another's post. */
const TEST_POST_AREAS: Record<TestPost["kind"], readonly AccessArea[]> = {
	greeting: ["welcome"],
	goodbye: ["welcome"],
	birthday: ["birthdays"],
	announcement: ["announcements"],
	plain: ["sticky", "scheduled-messages", "auto-responders"],
};

/** Keyed by server and person, so a test in one server never holds up one in another. */
export const testPostLimiter = new RateLimiter({ limit: TEST_POST_LIMITS.perMinute, windowMs: MINUTE_MS });

/** The draft goes to the person asking and to nobody else; there is no recipient to choose. */
testPost.post("/", async (context) => {
	const guild = guildOf(context);
	const body = await parseBody(context, testPostBody);
	const areas = areasOf(context);
	// A kind of post only a switched-off feature makes is one the bot no longer sends.
	const off = context.get("client").featuresOff;
	if (TEST_POST_AREAS[body.kind].every((area) => screenIsOff(off, `/guilds/${guild.id}/${area}`) !== null)) {
		throw featureOff();
	}
	if (areas !== null && !TEST_POST_AREAS[body.kind].some((area) => areas.includes(area))) {
		throw forbidden("not_granted", "Your access to that server does not include this.");
	}

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
