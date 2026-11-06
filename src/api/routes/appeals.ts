import { type Context, Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { unauthorised } from "@api/errors";
import { requireAuth } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { readOwnAppeals, submitAppeal } from "@lib/appeals";
import { appealBody, appealServerParams } from "@testify/shared";

/** A banned person's own appeals: which servers they can appeal to, and sending one; whose it is comes from the session. */
export const appeals = new Hono<ApiBindings>();

appeals.use("*", requireAuth);

function signedIn(context: Context<ApiBindings>): { id: string; username: string } {
	const session = context.get("session");
	if (session === undefined) throw unauthorised();

	return { id: session.userId, username: session.username };
}

appeals.get("/", async (context) => context.json(await readOwnAppeals(context.get("client"), signedIn(context).id)));

appeals.post("/:guildId", async (context) => {
	const { guildId } = parseParams(context, appealServerParams);
	const { text } = await parseBody(context, appealBody);

	return context.json(await submitAppeal(context.get("client"), guildId, signedIn(context), text), 201);
});
