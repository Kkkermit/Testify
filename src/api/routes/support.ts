import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { notFound } from "@api/errors";
import { requireAuth } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { DEFAULT_PREFIX } from "@config/constants";
import { supportContext, supportDesk } from "@lib/support";
import {
	type SupportArticle,
	supportArticleParams,
	type SupportIndex,
	supportQuestion,
	type SupportReply,
} from "@testify/shared";

/** The Help page's assistant; every answer is a written article, and the question is neither stored nor logged. */
export const support = new Hono<ApiBindings>();

support.use("*", requireAuth);

support.get("/", (context) => {
	const client = context.get("client");
	const body: SupportIndex = { suggested: supportDesk(client).suggested(supportContext(client, DEFAULT_PREFIX)) };

	return context.json(body);
});

support.post("/ask", async (context) => {
	const client = context.get("client");
	const { question } = await parseBody(context, supportQuestion);
	const body: SupportReply = await supportDesk(client).ask(question, supportContext(client, DEFAULT_PREFIX));

	return context.json(body);
});

support.get("/articles/:articleId", (context) => {
	const client = context.get("client");
	const { articleId } = parseParams(context, supportArticleParams);
	const article: SupportArticle | null = supportDesk(client).article(articleId, supportContext(client, DEFAULT_PREFIX));
	if (article === null) throw notFound("unknown_article", "There is no help article with that id.");

	return context.json(article);
});
