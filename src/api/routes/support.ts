import { Hono } from "hono";
import { type ApiBindings } from "@api/context";
import { notFound } from "@api/errors";
import { requireAuth } from "@api/middleware/session";
import { parseBody, parseParams } from "@api/validate";
import { DEFAULT_PREFIX } from "@config/constants";
import { supportContext, supportDesk } from "@lib/support";
import { supportArticleParams, type SupportIndex, supportQuestion, type SupportReply } from "@testify/shared";

/** The help articles, public because the docs show them to somebody who has not signed in. */
export const supportArticles = new Hono<ApiBindings>();

/** The Help page's assistant; every answer is a written article, and the question is neither stored nor logged. */
export const supportQuestions = new Hono<ApiBindings>();

// Asking may cost a model call, so it stays behind a sign-in, and exists only with the dashboard.
supportQuestions.use("*", requireAuth);

supportArticles.get("/", (context) => {
	const client = context.get("client");
	const body: SupportIndex = { articles: supportDesk(client).catalogue(supportContext(DEFAULT_PREFIX)) };

	return context.json(body);
});

supportQuestions.post("/ask", async (context) => {
	const client = context.get("client");
	const { question } = await parseBody(context, supportQuestion);
	const body: SupportReply = await supportDesk(client).ask(question, supportContext(DEFAULT_PREFIX));

	return context.json(body);
});

supportArticles.get("/articles/:articleId", (context) => {
	const client = context.get("client");
	const { articleId } = parseParams(context, supportArticleParams);
	const help = supportContext(DEFAULT_PREFIX);
	const desk = supportDesk(client);

	const answer = desk.article(articleId, help);
	if (answer === null) throw notFound("unknown_article", "There is no help article with that id.");

	const body: SupportReply = { answer, related: desk.relatedTo(articleId, help) };
	return context.json(body);
});
